const {
  validateValues,
  validateUpload,
  isValidFooterUrl,
} = require("../../../utils/branding/validate");
const { makePng, makeJpeg } = require("./fixtures.cjs");

const svgFile = (body, attrs = 'viewBox="0 0 400 100"') => ({
  buffer: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`
  ),
});

describe("validateValues", () => {
  it("accepts a valid set and returns the stored form", () => {
    const { ok, clean, errors } = validateValues({
      custom_app_name: "  Orbit Ops  ",
      brand_tagline: "Mission planning assistant",
      meta_page_title: "",
      meta_page_favicon: "https://example.com/icon.png",
      brand_accent: "#4AF",
      brand_accent_light: "",
      brand_default_theme: "light",
      brand_login_notice_enabled: true,
      brand_login_require_ack: "false",
      brand_login_notice_heading: "Authorized use only",
      brand_login_notice_text: "Line one\r\nLine two",
      brand_banner_enabled: "true",
      brand_banner_text: "cui",
      brand_banner_bg: "#502B85",
      brand_banner_position: "top",
      support_email: "help@example.com",
      footer_data: JSON.stringify([
        { icon: "Envelope", url: "mailto:help@example.com" },
        { icon: "Globe", url: "https://example.com" },
      ]),
    });
    expect(errors).toEqual({});
    expect(ok).toBe(true);
    expect(clean).toMatchObject({
      custom_app_name: "Orbit Ops",
      meta_page_title: null,
      meta_page_favicon: "https://example.com/icon.png",
      brand_accent: "#44aaff",
      brand_accent_light: null,
      brand_login_notice_enabled: "true",
      brand_login_require_ack: "false",
      brand_login_notice_text: "Line one\nLine two",
      brand_banner_bg: "#502b85",
    });
    expect(JSON.parse(clean.footer_data)).toHaveLength(2);
  });

  it("reports a code per invalid field and nothing else", () => {
    const { ok, errors } = validateValues({
      custom_app_name: "<b>Bold</b>",
      brand_tagline: "x".repeat(81),
      meta_page_favicon: "javascript:alert(1)",
      brand_accent: "blue",
      brand_default_theme: "sepia",
      brand_login_notice_enabled: "yes",
      brand_login_notice_heading: "Line\nbreak",
      brand_banner_position: "bottom",
      support_email: "not-an-email",
      footer_data: "{not json",
      brand_logo_dark: "logo.png",
      custom_app_name_extra: "x",
    });
    expect(ok).toBe(false);
    expect(errors).toEqual({
      custom_app_name: "invalid_chars",
      brand_tagline: "too_long",
      meta_page_favicon: "invalid_url",
      brand_accent: "invalid_hex",
      brand_default_theme: "invalid_choice",
      brand_login_notice_enabled: "invalid_choice",
      brand_login_notice_heading: "invalid_chars",
      brand_banner_position: "invalid_choice",
      support_email: "invalid_email",
      footer_data: "invalid_json",
      brand_logo_dark: "unknown_field",
      custom_app_name_extra: "unknown_field",
    });
  });

  it("enforces length limits", () => {
    expect(validateValues({ custom_app_name: "x".repeat(40) }).ok).toBe(true);
    expect(validateValues({ custom_app_name: "x".repeat(41) }).errors).toEqual({
      custom_app_name: "too_long",
    });
    expect(
      validateValues({ brand_login_notice_text: "x".repeat(1001) }).errors
    ).toEqual({ brand_login_notice_text: "too_long" });
    expect(
      validateValues({ brand_banner_text: "x".repeat(81) }).errors
    ).toEqual({ brand_banner_text: "too_long" });
  });

  it("treats empty strings as not set", () => {
    const { clean } = validateValues({
      custom_app_name: "",
      brand_accent: "",
      brand_default_theme: "",
      footer_data: "",
    });
    expect(clean).toEqual({
      custom_app_name: null,
      brand_accent: null,
      brand_default_theme: null,
      footer_data: null,
    });
  });

  it("checks footer links: at most 3, known icons, http(s) or mailto", () => {
    const link = (icon, url) => ({ icon, url });
    expect(
      validateValues({
        footer_data: JSON.stringify([
          link("Info", "https://a.example"),
          link("Info", "https://b.example"),
          link("Info", "https://c.example"),
          link("Info", "https://d.example"),
        ]),
      }).errors
    ).toEqual({ footer_data: "too_many" });
    expect(
      validateValues({
        footer_data: JSON.stringify([link("Skull", "https://a.example")]),
      }).errors
    ).toEqual({ footer_data: "invalid_link" });
    expect(
      validateValues({
        footer_data: JSON.stringify([link("Info", "javascript:alert(1)")]),
      }).errors
    ).toEqual({ footer_data: "invalid_link" });
    expect(isValidFooterUrl("mailto:ops@example.com")).toBe(true);
    expect(isValidFooterUrl("mailto:nobody")).toBe(false);
    expect(isValidFooterUrl("ftp://example.com")).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(validateValues(null).ok).toBe(false);
    expect(validateValues(["x"]).ok).toBe(false);
  });

  it("reports __proto__ and constructor keys as unknown fields", () => {
    // JSON.parse makes "__proto__" an own key, as a request body would.
    const payload = JSON.parse(
      '{"__proto__":"x","constructor":{"custom_app_name":"y"}}'
    );
    const { ok, clean, errors } = validateValues(payload);
    expect(ok).toBe(false);
    expect(Object.keys(errors).sort()).toEqual(["__proto__", "constructor"]);
    expect(errors.__proto__).toBe("unknown_field");
    expect(Object.keys(clean)).toEqual([]);
    expect({}.custom_app_name).toBeUndefined();
  });
});

describe("validateUpload", () => {
  const expectCode = (fn, code) => {
    try {
      fn();
    } catch (error) {
      expect(error.code).toBe(code);
      return;
    }
    throw new Error(`expected ${code}`);
  };

  it("accepts a normal logo and names its slot", () => {
    const [file] = validateUpload("logo-dark", {
      file: { buffer: makePng(400, 100) },
    });
    expect(file).toMatchObject({
      name: "logo-dark",
      image: { type: "png", width: 400, height: 100 },
    });
  });

  it("rejects missing, unsupported, tiny and badly shaped logos", () => {
    expectCode(() => validateUpload("logo-dark", {}), "missing_file");
    expectCode(
      () =>
        validateUpload("logo-dark", {
          file: { buffer: Buffer.from("GIF89a....") },
        }),
      "unsupported_type"
    );
    expectCode(
      () => validateUpload("logo-dark", { file: { buffer: makePng(16, 16) } }),
      "too_small"
    );
    expectCode(
      () => validateUpload("logo-dark", { file: { buffer: makePng(48, 16) } }),
      "too_small"
    );
    expectCode(
      () =>
        validateUpload("logo-light", { file: { buffer: makePng(100, 200) } }),
      "bad_aspect"
    );
    expectCode(
      () =>
        validateUpload("logo-light", { file: { buffer: makePng(1300, 100) } }),
      "bad_aspect"
    );
  });

  it("rejects files over the size limit", () => {
    const big = Buffer.concat([
      makePng(400, 100),
      Buffer.alloc(2 * 1024 * 1024),
    ]);
    try {
      validateUpload("logo-dark", { file: { buffer: big } });
      throw new Error("expected too_large");
    } catch (error) {
      expect(error.code).toBe("too_large");
      expect(error.status).toBe(413);
    }
  });

  it("sanitizes SVG logos and rejects unsafe or sizeless ones", () => {
    const [file] = validateUpload("logo-dark", {
      file: svgFile(
        '<rect width="400" height="100"/><script>alert(1)</script>'
      ),
    });
    expect(file.image.type).toBe("svg");
    expect(file.image.buffer.toString()).not.toContain("script");
    expectCode(
      () =>
        validateUpload("logo-dark", {
          file: svgFile("<script>alert(1)</script>"),
        }),
      "invalid_svg"
    );
    expectCode(
      () =>
        validateUpload("logo-dark", {
          file: svgFile('<rect width="1" height="1"/>', ""),
        }),
      "invalid_svg"
    );
  });

  it("requires a square icon source and exact PNG variants", () => {
    const variants = {
      "icon-32": { buffer: makePng(32, 32) },
      "icon-180": { buffer: makePng(180, 180) },
      "icon-192": { buffer: makePng(192, 192) },
      "icon-512": { buffer: makePng(512, 512) },
    };
    const files = validateUpload("icon", {
      file: { buffer: makePng(512, 512) },
      ...variants,
    });
    expect(files.map((f) => f.name)).toEqual([
      "icon-source",
      "icon-32",
      "icon-180",
      "icon-192",
      "icon-512",
    ]);

    // within 2 percent counts as square
    expect(() =>
      validateUpload("icon", {
        file: { buffer: makePng(512, 505) },
        ...variants,
      })
    ).not.toThrow();
    expectCode(
      () =>
        validateUpload("icon", {
          file: { buffer: makePng(512, 400) },
          ...variants,
        }),
      "not_square"
    );
    expectCode(
      () =>
        validateUpload("icon", {
          file: { buffer: makePng(128, 128) },
          ...variants,
        }),
      "too_small"
    );
    expectCode(
      () =>
        validateUpload("icon", {
          file: { buffer: makePng(512, 512) },
          ...variants,
          "icon-180": { buffer: makePng(64, 64) },
        }),
      "upload_failed"
    );
    expectCode(
      () =>
        validateUpload("icon", {
          file: { buffer: makePng(512, 512) },
          ...variants,
          "icon-32": { buffer: makeJpeg(32, 32) },
        }),
      "unsupported_type"
    );
    const { "icon-512": _omit, ...missingOne } = variants;
    expectCode(
      () =>
        validateUpload("icon", {
          file: { buffer: makePng(512, 512) },
          ...missingOne,
        }),
      "missing_file"
    );
  });
});
