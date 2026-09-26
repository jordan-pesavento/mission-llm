const fs = require("fs");
const os = require("os");
const path = require("path");

// Storage for this suite lives in a throwaway folder under the OS temp dir.
const STORAGE = fs.mkdtempSync(path.join(os.tmpdir(), "branding-test-"));
process.env.STORAGE_DIR = STORAGE;

jest.mock("../../../utils/prisma", () =>
  require("./fixtures.cjs").createFakePrisma()
);
// Loading the server modules instantiates EncryptionManager, which writes a
// fresh key pair to server/.env when none is configured. Tests must not.
jest.mock("../../../utils/EncryptionManager", () => ({
  EncryptionManager: class {
    encrypt() {
      return null;
    }
    decrypt() {
      return null;
    }
  },
}));

const prisma = require("../../../utils/prisma");
const branding = require("../../../utils/branding");
const { invalidateBrand } = require("../../../utils/branding/cache");
const { makePng } = require("./fixtures.cjs");

const BRANDING_DIR = path.join(STORAGE, "assets", "branding");
const BACKUPS_DIR = path.join(STORAGE, "branding-backups");
const listStored = () =>
  fs.existsSync(BRANDING_DIR)
    ? fs.readdirSync(BRANDING_DIR).filter((name) => !name.startsWith("_"))
    : [];
const iconSet = (color = [34, 167, 160, 255]) => ({
  file: { buffer: makePng(512, 512, color) },
  "icon-32": { buffer: makePng(32, 32, color) },
  "icon-180": { buffer: makePng(180, 180, color) },
  "icon-192": { buffer: makePng(192, 192, color) },
  "icon-512": { buffer: makePng(512, 512, color) },
});

beforeEach(() => {
  prisma.__rows.clear();
  jest.clearAllMocks();
  fs.rmSync(path.join(STORAGE, "assets"), { recursive: true, force: true });
  fs.rmSync(BACKUPS_DIR, { recursive: true, force: true });
  invalidateBrand();
});

afterAll(() => {
  fs.rmSync(STORAGE, { recursive: true, force: true });
});

describe("getBrand", () => {
  it("returns today's look when nothing is set", async () => {
    const brand = await branding.getBrand();
    expect(brand.version).toMatch(/^[0-9a-f]{12}$/);
    expect(brand).toMatchObject({
      appName: "Mission LLM",
      customAppName: null,
      tagline: "Sigmatech private AI platform",
      pageTitle: "Mission LLM | Private, self-hosted AI",
      defaultTheme: "system",
      css: "",
      login: { requireAck: false, notice: { enabled: false } },
      banner: {
        enabled: false,
        text: "UNCLASSIFIED",
        bg: "#007a33",
        fg: "#ffffff",
        position: "both",
      },
    });
    expect(brand.assets).toEqual({
      logoDark: {
        url: null,
        custom: false,
        inherited: false,
        width: null,
        height: null,
      },
      logoLight: {
        url: null,
        custom: false,
        inherited: false,
        width: null,
        height: null,
      },
      icon: { custom: false, urls: null },
      favicon: { url: "/favicon.png", source: "default" },
    });
    expect(brand).not.toHaveProperty("supportEmail");
    expect(JSON.stringify(brand)).not.toMatch(/support_email|footer_data/);
  });

  it("ignores a stored favicon URL that is not http(s)", async () => {
    prisma.__set("meta_page_favicon", "javascript:alert(1)");
    const brand = await branding.getBrand();
    expect(brand.assets.favicon).toEqual({
      url: "/favicon.png",
      source: "default",
    });
  });

  it("gives an unset legacy logo and the shipped default name the same version", async () => {
    const unset = (await branding.getBrand()).version;
    prisma.__set("logo_filename", "mission-llm.png");
    invalidateBrand();
    expect((await branding.getBrand()).version).toBe(unset);
  });

  it("serves a cached brand until something is written", async () => {
    await branding.getBrand();
    await branding.getBrand();
    expect(prisma.system_settings.findMany).toHaveBeenCalledTimes(1);
  });
});

describe("updateBrandValues", () => {
  it("saves nothing when any value is invalid", async () => {
    const result = await branding.updateBrandValues({
      custom_app_name: "Orbit Ops",
      brand_accent: "not-a-color",
    });
    expect(result).toEqual({
      success: false,
      errors: { brand_accent: "invalid_hex" },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.__get("custom_app_name")).toBeNull();
  });

  it("writes changed values in one transaction and updates the brand", async () => {
    const before = await branding.getBrand();
    const result = await branding.updateBrandValues({
      custom_app_name: "Orbit Ops",
      brand_tagline: "Flight planning",
      brand_accent: "#22A7A0",
      brand_login_notice_enabled: "true",
      brand_login_require_ack: "true",
      support_email: "ops@example.com",
    });
    expect(result.success).toBe(true);
    expect(result.changed.sort()).toEqual(
      [
        "brand_accent",
        "brand_login_notice_enabled",
        "brand_login_require_ack",
        "brand_tagline",
        "custom_app_name",
        "support_email",
      ].sort()
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.values.brand_accent).toBe("#22a7a0");
    expect(result.brand.version).not.toBe(before.version);
    expect(result.brand).toMatchObject({
      appName: "Orbit Ops",
      tagline: "Flight planning",
      pageTitle: "Orbit Ops | Flight planning",
      login: { requireAck: true },
    });
    // Dark theme: one lightness step darker, so white button text reaches AA.
    expect(result.brand.css).toContain("--ml-accent-rgb:28 164 157");

    // Saving the same values again changes nothing.
    const again = await branding.updateBrandValues({
      custom_app_name: "Orbit Ops",
    });
    expect(again.changed).toEqual([]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(again.brand.version).toBe(result.brand.version);
  });

  it("requires an acknowledgment only while the notice is shown", async () => {
    await branding.updateBrandValues({ brand_login_require_ack: "true" });
    expect(await branding.signInAckRequired()).toBe(false);
    await branding.updateBrandValues({ brand_login_notice_enabled: "true" });
    expect(await branding.signInAckRequired()).toBe(true);
  });

  it("uses the tab title override, else name and tagline", async () => {
    await branding.updateBrandValues({ custom_app_name: "Orbit Ops" });
    expect((await branding.getBrand()).pageTitle).toBe(
      "Orbit Ops | Sigmatech private AI platform"
    );
    await branding.updateBrandValues({ meta_page_title: "Ops Console" });
    expect((await branding.getBrand()).pageTitle).toBe("Ops Console");
  });
});

describe("asset slots", () => {
  it("stores a logo under a content-hash name and shares it with the other theme", async () => {
    const brand = await branding.setAsset("logo-dark", {
      file: { buffer: makePng(400, 100) },
    });
    const [stored] = listStored();
    expect(stored).toMatch(/^logo-dark-[0-9a-f]{16}\.png$/);
    expect(prisma.__get("brand_logo_dark")).toBe(stored);
    const hash = stored.slice("logo-dark-".length, -4);
    expect(brand.assets.logoDark).toEqual({
      url: `/system/branding/asset/logo-dark?v=${hash}`,
      custom: true,
      inherited: false,
      width: 400,
      height: 100,
    });
    expect(brand.assets.logoLight).toMatchObject({
      url: brand.assets.logoDark.url,
      custom: false,
      inherited: true,
    });

    const file = await branding.getAssetFile("logo-dark");
    expect(file.mime).toBe("image/png");
    expect(file.hash).toBe(hash);
    expect(await branding.getAssetFile("logo-light")).toBeNull();
  });

  it("keeps the live file when the same content is uploaded twice", async () => {
    const buffer = makePng(400, 100);
    await branding.setAsset("logo-dark", { file: { buffer } });
    const [first] = listStored();
    const brand = await branding.setAsset("logo-dark", {
      file: { buffer: Buffer.from(buffer) },
    });
    expect(listStored()).toEqual([first]);
    expect(fs.existsSync(path.join(BRANDING_DIR, first))).toBe(true);
    expect(prisma.__get("brand_logo_dark")).toBe(first);
    expect(brand.assets.logoDark.custom).toBe(true);
    expect(
      (await branding.getAssetFile("logo-dark")).buffer.equals(buffer)
    ).toBe(true);
  });

  it("survives two identical uploads at the same time", async () => {
    const buffer = makePng(300, 100);
    await Promise.all([
      branding.setAsset("logo-light", { file: { buffer } }),
      branding.setAsset("logo-light", {
        file: { buffer: Buffer.from(buffer) },
      }),
    ]);
    const stored = listStored();
    expect(stored).toHaveLength(1);
    expect(prisma.__get("brand_logo_light")).toBe(stored[0]);
  });

  it("removes the replaced file after a new upload is saved", async () => {
    await branding.setAsset("logo-dark", {
      file: { buffer: makePng(400, 100) },
    });
    const [first] = listStored();
    await branding.setAsset("logo-dark", {
      file: { buffer: makePng(400, 100, [255, 0, 0, 255]) },
    });
    const stored = listStored();
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toBe(first);
  });

  it("writes nothing for an invalid upload", async () => {
    await expect(
      branding.setAsset("logo-dark", { file: { buffer: makePng(16, 16) } })
    ).rejects.toMatchObject({ code: "too_small" });
    expect(listStored()).toEqual([]);
    expect(prisma.system_settings.upsert).not.toHaveBeenCalled();
  });

  it("stores an icon set and uses it for the favicon", async () => {
    const brand = await branding.setAsset("icon", iconSet());
    expect(listStored()).toHaveLength(5);
    expect(Object.keys(JSON.parse(prisma.__get("brand_icon"))).sort()).toEqual(
      ["180", "192", "32", "512", "source"].sort()
    );
    expect(brand.assets.icon.custom).toBe(true);
    expect(brand.assets.icon.urls["180"]).toMatch(
      /^\/system\/branding\/asset\/icon-180\?v=[0-9a-f]{16}$/
    );
    expect(brand.assets.favicon).toEqual({
      url: brand.assets.icon.urls["32"],
      source: "icon",
    });
    expect((await branding.getAssetFile("icon-512")).mime).toBe("image/png");

    // A favicon URL still overrides the uploaded icon.
    await branding.updateBrandValues({
      meta_page_favicon: "https://example.com/f.png",
    });
    expect((await branding.getBrand()).assets.favicon).toEqual({
      url: "https://example.com/f.png",
      source: "url",
    });
  });

  it("stores a sanitized SVG logo", async () => {
    await branding.setAsset("logo-light", {
      file: {
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" onload="alert(1)"><script>alert(2)</script><rect width="400" height="100"/></svg>'
        ),
      },
    });
    const [stored] = listStored();
    expect(stored).toMatch(/^logo-light-[0-9a-f]{16}\.svg$/);
    const text = fs.readFileSync(path.join(BRANDING_DIR, stored), "utf8");
    expect(text).not.toMatch(/script|onload|alert/);
    const brand = await branding.getBrand();
    expect(brand.assets.logoLight).toMatchObject({
      custom: true,
      width: 400,
      height: 100,
    });
    expect((await branding.getAssetFile("logo-light")).mime).toBe(
      "image/svg+xml"
    );
  });

  it("resets a slot to the default and removes its files", async () => {
    await branding.setAsset("icon", iconSet());
    const { brand, removed } = await branding.removeAsset("icon");
    expect(removed).toBe(true);
    expect(listStored()).toEqual([]);
    expect(prisma.__get("brand_icon")).toBeNull();
    expect(brand.assets.icon).toEqual({ custom: false, urls: null });
    expect(brand.assets.favicon.source).toBe("default");
  });
});

describe("legacy logo", () => {
  const writeLegacy = (name, buffer) => {
    fs.mkdirSync(path.join(STORAGE, "assets"), { recursive: true });
    fs.writeFileSync(path.join(STORAGE, "assets", name), buffer);
    prisma.__set("logo_filename", name);
    invalidateBrand();
  };

  it("serves an old custom logo as the dark logo", async () => {
    writeLegacy("0b6f.png", makePng(320, 80));
    const brand = await branding.getBrand();
    expect(brand.assets.logoDark).toMatchObject({
      custom: true,
      legacy: true,
      width: 320,
    });
    expect(brand.assets.logoLight).toMatchObject({ inherited: true });
    expect((await branding.getAssetFile("logo-dark")).mime).toBe("image/png");
  });

  it("ignores the shipped default filename", async () => {
    writeLegacy("mission-llm.png", makePng(320, 80));
    const brand = await branding.getBrand();
    expect(brand.assets.logoDark.custom).toBe(false);
  });

  it("treats other spellings of the shipped default as the default and never deletes it", async () => {
    const shipped = path.join(STORAGE, "assets", "mission-llm.png");
    for (const alias of [
      "./mission-llm.png",
      "MISSION-LLM.PNG",
      "mission-llm.png ",
      "mission-llm.png.",
      ".\\mission-llm.png",
      "x/../mission-llm.png",
      "mission-llm.png::$DATA",
      "Mission-LLM-Invert.png",
    ]) {
      writeLegacy("mission-llm.png", makePng(320, 80));
      prisma.__set("logo_filename", alias);
      invalidateBrand();
      const brand = await branding.getBrand();
      expect(brand.assets.logoDark).toMatchObject({ custom: false, url: null });
      expect(await branding.getAssetFile("logo-dark")).toBeNull();

      await branding.setAsset("logo-dark", {
        file: { buffer: makePng(400, 100) },
      });
      await branding.removeAsset("logo-dark");
      await branding.resetBranding({ includeLinks: true });
      expect(fs.existsSync(shipped)).toBe(true);
    }
  });

  it("never serves a legacy name that points into a sub-folder", async () => {
    fs.mkdirSync(path.join(STORAGE, "assets", "branding"), { recursive: true });
    fs.writeFileSync(
      path.join(STORAGE, "assets", "branding", "values.json"),
      JSON.stringify({ support_email: "ops@example.com" })
    );
    prisma.__set("logo_filename", "branding/values.json");
    invalidateBrand();
    expect((await branding.getBrand()).assets.logoDark.custom).toBe(false);
    expect(await branding.getAssetFile("logo-dark")).toBeNull();
  });

  it("is retired by a new dark logo", async () => {
    writeLegacy("0b6f.png", makePng(320, 80));
    await branding.setAsset("logo-dark", {
      file: { buffer: makePng(400, 100) },
    });
    expect(prisma.__get("logo_filename")).toBe("mission-llm.png");
    expect(fs.existsSync(path.join(STORAGE, "assets", "0b6f.png"))).toBe(false);
  });
});

describe("resetBranding", () => {
  it("restores defaults and moves files to a backup folder outside the assets tree", async () => {
    const baseline = await branding.getBrand();
    await branding.updateBrandValues({
      custom_app_name: "Orbit Ops",
      brand_accent: "#d9485f",
      brand_banner_enabled: "true",
      support_email: "ops@example.com",
    });
    await branding.setAsset("logo-dark", {
      file: { buffer: makePng(400, 100) },
    });
    await branding.setAsset("icon", iconSet());
    const stored = listStored();

    const { brand, changed, backup } = await branding.resetBranding({
      includeLinks: false,
    });
    expect(changed).toEqual(
      expect.arrayContaining([
        "custom_app_name",
        "brand_accent",
        "brand_logo_dark",
        "brand_icon",
      ])
    );
    expect(changed).not.toContain("support_email");
    expect(listStored()).toEqual([]);
    const backupDir = backup.folder;
    expect(path.dirname(backupDir)).toBe(BACKUPS_DIR);
    expect(path.basename(backupDir)).toMatch(/^reset-\d{8}T\d{9}Z(-\d{2})?$/);
    expect(backupDir.startsWith(path.join(STORAGE, "assets"))).toBe(false);
    expect(fs.readdirSync(backupDir).sort()).toEqual(
      [...stored, "values.json"].sort()
    );
    const saved = JSON.parse(
      fs.readFileSync(path.join(backupDir, "values.json"), "utf8")
    );
    expect(saved.values.custom_app_name).toBe("Orbit Ops");

    expect(prisma.__get("support_email")).toBe("ops@example.com");
    const { version: _v1, ...resetBrand } = brand;
    const { version: _v2, ...defaultBrand } = baseline;
    expect(resetBrand).toEqual(defaultBrand);
  });

  it("keeps earlier backups: a second reset never deletes the first one", async () => {
    await branding.updateBrandValues({
      custom_app_name: "Orbit Ops",
      support_email: "ops@example.com",
    });
    await branding.setAsset("logo-dark", {
      file: { buffer: makePng(400, 100) },
    });
    const [logo] = listStored();
    const first = await branding.resetBranding({ includeLinks: false });
    expect(first.backup.files).toEqual([logo]);

    // Second reset: no files, but the support email is still set.
    const second = await branding.resetBranding({ includeLinks: true });
    expect(second.backup.folder).not.toBe(first.backup.folder);
    expect(second.backup.files).toEqual([]);
    expect(fs.readdirSync(first.backup.folder).sort()).toEqual(
      [logo, "values.json"].sort()
    );
    const firstValues = JSON.parse(
      fs.readFileSync(path.join(first.backup.folder, "values.json"), "utf8")
    );
    expect(firstValues.values.custom_app_name).toBe("Orbit Ops");
    const secondValues = JSON.parse(
      fs.readFileSync(path.join(second.backup.folder, "values.json"), "utf8")
    );
    expect(secondValues.values.support_email).toBe("ops@example.com");

    // Third reset: nothing left to keep, so no new backup is written.
    const third = await branding.resetBranding({ includeLinks: true });
    expect(third.backup).toEqual({ folder: null, files: [] });
    expect(fs.readdirSync(BACKUPS_DIR)).toHaveLength(2);
  });

  it("keeps only the newest five backups", async () => {
    for (let i = 0; i < 7; i++) {
      await branding.updateBrandValues({ custom_app_name: `Orbit ${i}` });
      await branding.resetBranding({ includeLinks: false });
    }
    const folders = fs.readdirSync(BACKUPS_DIR).sort();
    expect(folders).toHaveLength(5);
    const names = folders.map(
      (name) =>
        JSON.parse(
          fs.readFileSync(path.join(BACKUPS_DIR, name, "values.json"), "utf8")
        ).values.custom_app_name
    );
    expect(names).toEqual(["Orbit 2", "Orbit 3", "Orbit 4", "Orbit 5", "Orbit 6"]);
  });

  it("also clears support email and footer links when asked", async () => {
    await branding.updateBrandValues({
      support_email: "ops@example.com",
      footer_data: JSON.stringify([
        { icon: "Info", url: "https://example.com" },
      ]),
    });
    const { changed } = await branding.resetBranding({ includeLinks: true });
    expect(changed.sort()).toEqual(["footer_data", "support_email"]);
    expect(prisma.__get("support_email")).toBeNull();
    expect(prisma.__get("footer_data")).toBeNull();
  });
});
