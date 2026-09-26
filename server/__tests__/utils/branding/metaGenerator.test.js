const mockBrand = { current: null };
jest.mock("../../../utils/branding", () => ({
  getBrand: jest.fn(async () => mockBrand.current),
}));

const { MetaGenerator } = require("../../../utils/boot/MetaGenerator");

function fakeResponse() {
  return {
    headers: {},
    status(code) {
      this.code = code;
      return this;
    },
    type(value) {
      this.headers["content-type"] = value;
      return this;
    },
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
    end() {
      return this;
    },
  };
}

function brand(overrides = {}) {
  return {
    version: "aaaaaaaaaaaa",
    appName: "Mission LLM",
    customAppName: null,
    tagline: "Sigmatech private AI platform",
    customTagline: null,
    pageTitle: "Mission LLM | Private, self-hosted AI",
    css: "",
    assets: {
      icon: { custom: false, urls: null },
      favicon: { url: "/favicon.png", source: "default" },
    },
    ...overrides,
  };
}

async function render() {
  const response = fakeResponse();
  await new MetaGenerator().generate(response);
  return response.body;
}

describe("MetaGenerator", () => {
  it("renders today's head for the default brand", async () => {
    mockBrand.current = brand();
    const html = await render();
    expect(html).toContain(
      "<title >Mission LLM | Private, self-hosted AI</title>"
    );
    expect(html).toContain('<link rel="icon" href="/favicon.png" >');
    expect(html).toContain('<style id="mission-brand"></style>');
    expect(html).toContain("window.__MISSION_BRAND__=");
  });

  it("rebuilds the head when the brand version changes", async () => {
    mockBrand.current = brand({
      version: "bbbbbbbbbbbb",
      appName: "Orbit Ops",
      customAppName: "Orbit Ops",
      pageTitle: "Orbit Ops | Flight planning",
      customTagline: "Flight planning",
      css: ":root:root{--ml-accent-rgb:34 167 160;--ml-on-accent:#ffffff}:root:root[data-theme=light]{--ml-accent-rgb:0 124 119;--ml-on-accent:#ffffff}",
      assets: {
        icon: {
          custom: true,
          urls: {
            32: "/system/branding/asset/icon-32?v=1111111111111111",
            180: "/system/branding/asset/icon-180?v=2222222222222222",
          },
        },
        favicon: {
          url: "/system/branding/asset/icon-32?v=1111111111111111",
          source: "icon",
        },
      },
    });
    const html = await render();
    expect(html).toContain("<title >Orbit Ops | Flight planning</title>");
    expect(html).toContain('name="description" content="Flight planning"');
    expect(html).toContain(
      'rel="icon" href="/api/system/branding/asset/icon-32?v=1111111111111111"'
    );
    expect(html).toContain(
      'rel="apple-touch-icon" href="/api/system/branding/asset/icon-180?v=2222222222222222"'
    );
    // The accent CSS is emitted as is, not HTML-escaped.
    expect(html).toContain(
      '<style id="mission-brand">:root:root{--ml-accent-rgb:34 167 160;--ml-on-accent:#ffffff}:root:root[data-theme=light]'
    );
  });

  it("escapes brand text in the head and in the inline brand JSON", async () => {
    mockBrand.current = brand({
      version: "cccccccccccc",
      customTagline: '</script><script>alert("x")</script> & \u2028',
      pageTitle: '"><img src=x onerror=alert(1)>',
    });
    const html = await render();
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
    const script = html.slice(html.indexOf("window.__MISSION_BRAND__="));
    const json = script.slice(0, script.indexOf(";</script>"));
    expect(json).not.toMatch(/<|>|&|\u2028/);
    expect(json).toContain("\\u003c/script\\u003e");
    const parsed = JSON.parse(json.slice("window.__MISSION_BRAND__=".length));
    expect(parsed.customTagline).toBe(mockBrand.current.customTagline);
  });

  it("applies the default theme and the banner space before the first paint", async () => {
    const { JSDOM } = require("jsdom");
    const run = (html, storage = {}) => {
      const dom = new JSDOM(html, {
        url: "http://127.0.0.1/",
        runScripts: "dangerously",
        beforeParse(window) {
          for (const [key, value] of Object.entries(storage))
            window.localStorage.setItem(key, value);
        },
      });
      const root = dom.window.document.documentElement;
      const result = {
        theme: root.getAttribute("data-theme"),
        banner: root.getAttribute("data-ml-banner"),
        top: root.style.getPropertyValue("--ml-banner-top"),
        bottom: root.style.getPropertyValue("--ml-banner-bottom"),
      };
      dom.window.close();
      return result;
    };

    mockBrand.current = brand({
      version: "eeeeeeeeeeee",
      defaultTheme: "light",
      banner: { enabled: true, position: "top" },
    });
    const html = await render();
    expect(run(html)).toEqual({
      theme: "light",
      banner: "top",
      top: "26px",
      bottom: "0px",
    });
    // A user's own choice wins over the instance default; a legacy "system"
    // (written on every mount by older builds) does not count as a choice.
    expect(run(html, { missionllm_theme_choice: "dark" }).theme).toBe("dark");
    expect(run(html, { theme: "system" }).theme).toBe("light");

    mockBrand.current = brand({ version: "ffffffffffff" });
    const plain = run(await render());
    expect(plain.banner).toBeNull();
    expect(plain.top).toBe("");
    expect(plain.theme).toBe("dark");
  });

  it("refuses to inline CSS that the brand builder could not have produced", async () => {
    mockBrand.current = brand({
      version: "dddddddddddd",
      css: "</style><script>alert(1)</script>",
    });
    const html = await render();
    expect(html).toContain('<style id="mission-brand"></style>');
    expect(html).not.toContain("<script>alert(1)");
  });

  it("builds the manifest from the brand name and icon set", async () => {
    mockBrand.current = brand({
      appName: "Orbit Ops",
      assets: {
        icon: {
          custom: true,
          urls: {
            192: "/system/branding/asset/icon-192?v=3333333333333333",
            512: "/system/branding/asset/icon-512?v=4444444444444444",
          },
        },
        favicon: { url: "/x", source: "icon" },
      },
    });
    const response = fakeResponse();
    await new MetaGenerator().generateManifest(response);
    expect(response.body).toMatchObject({
      name: "Orbit Ops",
      short_name: "Orbit Ops",
      icons: [
        {
          src: "/api/system/branding/asset/icon-192?v=3333333333333333",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/api/system/branding/asset/icon-512?v=4444444444444444",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    });
  });
});
