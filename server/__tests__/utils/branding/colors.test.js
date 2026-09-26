const {
  normalizeHex,
  contrastRatio,
  computeAccent,
  accentCss,
  bannerTextColor,
  DARK_SURFACES,
  LIGHT_SURFACES,
} = require("../../../utils/branding/colors");

// Reference vectors. frontend/src/utils/branding/accent.js must return the
// same values for the same inputs.
const VECTORS = {
  // [base, light]: [dark hex, dark onAccent, dark ratio, dark adjusted,
  //                 light hex, light onAccent, light ratio, light adjusted]
  default: [
    null,
    null,
    ["#4f86ff", "#ffffff", 5, false, "#2458e6", "#ffffff", 8, false],
  ],
  missionBlue: [
    "#4f86ff",
    null,
    ["#4f86ff", "#ffffff", 5, false, "#3669e0", "#ffffff", 6.9, true],
  ],
  stellarTeal: [
    "#22a7a0",
    null,
    ["#1ca49d", "#ffffff", 4.6, true, "#007c77", "#ffffff", 7.1, true],
  ],
  opsGreen: [
    "#3fae6a",
    null,
    ["#43b16d", "#0b1220", 4.6, true, "#007e42", "#ffffff", 7.2, true],
  ],
  signalAmber: [
    "#e0a43a",
    null,
    ["#e0a43a", "#0b1220", 5.5, false, "#956700", "#ffffff", 7, true],
  ],
  crimson: [
    "#d9485f",
    null,
    ["#d9485f", "#ffffff", 6, false, "#cb3a54", "#ffffff", 6.9, true],
  ],
  deltaSilver: [
    "#8fa3c4",
    null,
    ["#8fa3c4", "#0b1220", 4.8, false, "#5d708f", "#ffffff", 7, true],
  ],
  lightYellow: [
    "#ffff99",
    null,
    ["#ffff99", "#0b1220", 11.1, false, "#757300", "#ffffff", 7, true],
  ],
  darkNavy: [
    "#0a0a40",
    null,
    ["#52609d", "#ffffff", 8.1, true, "#0a0a40", "#ffffff", 19.2, false],
  ],
  threeDigit: [
    "#4af",
    null,
    ["#44aaff", "#0b1220", 5, false, "#0072bb", "#ffffff", 7.1, true],
  ],
  lightOverride: [
    "#22a7a0",
    "#ff0000",
    ["#1ca49d", "#ffffff", 4.6, true, "#df0000", "#ffffff", 7.2, true],
  ],
};

describe("normalizeHex", () => {
  it("expands 3-digit hex and lowercases", () => {
    expect(normalizeHex("#4AF")).toBe("#44aaff");
    expect(normalizeHex("4af")).toBe("#44aaff");
    expect(normalizeHex(" #4F86FF ")).toBe("#4f86ff");
  });

  it("rejects anything else", () => {
    for (const bad of [
      "",
      "#12",
      "#12345",
      "#1234567",
      "#ggg",
      "red",
      null,
      123,
    ])
      expect(normalizeHex(bad)).toBeNull();
  });
});

describe("contrastRatio", () => {
  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
  });
});

describe("computeAccent", () => {
  for (const [name, [base, light, expected]] of Object.entries(VECTORS)) {
    it(`returns the reference result for ${name}`, () => {
      const accent = computeAccent(base, light);
      const [dHex, dOn, dRatio, dAdj, lHex, lOn, lRatio, lAdj] = expected;
      expect(accent.dark).toMatchObject({
        hex: dHex,
        onAccent: dOn,
        ratio: dRatio,
        adjusted: dAdj,
      });
      expect(accent.lightTheme).toMatchObject({
        hex: lHex,
        onAccent: lOn,
        ratio: lRatio,
        adjusted: lAdj,
      });
    });
  }

  it("keeps today's defaults when no accent is set", () => {
    const accent = computeAccent(null, null);
    expect(accent.base).toBeNull();
    expect(accent.light).toBeNull();
    expect(accent.dark.rgb).toBe("79 134 255");
    expect(accent.lightTheme.rgb).toBe("36 88 230");
    expect(accentCss(accent)).toBe("");
  });

  it("always meets the readability floors for custom colors", () => {
    for (const [base, light] of Object.values(VECTORS)) {
      if (!base) continue;
      const accent = computeAccent(base, light);
      for (const surface of DARK_SURFACES)
        expect(contrastRatio(accent.dark.hex, surface)).toBeGreaterThanOrEqual(
          3
        );
      for (const surface of LIGHT_SURFACES)
        expect(
          contrastRatio(accent.lightTheme.hex, surface)
        ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives AA button text in both themes for any base color", () => {
    // Independent WCAG math on the unrounded 80% fill.
    const lum = (rgb) =>
      rgb
        .map((c) => c / 255)
        .map((c) =>
          c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        )
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const channels = (hex) =>
      [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const textContrast = ({ hex, onAccent }) => {
      const fill = lum(channels(hex).map((c) => c * 0.8));
      const text = lum(channels(onAccent));
      return (Math.max(fill, text) + 0.05) / (Math.min(fill, text) + 0.05);
    };
    const steps = [0, 34, 68, 102, 136, 170, 204, 238, 255];
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const base = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
          const accent = computeAccent(base, null);
          expect(textContrast(accent.dark)).toBeGreaterThanOrEqual(4.5);
          expect(textContrast(accent.lightTheme)).toBeGreaterThanOrEqual(4.5);
          for (const surface of DARK_SURFACES)
            expect(
              contrastRatio(accent.dark.hex, surface)
            ).toBeGreaterThanOrEqual(3);
        }
  });

  it("normalizes the base and light inputs it reports", () => {
    expect(computeAccent("#4AF", "#F00")).toMatchObject({
      base: "#44aaff",
      light: "#ff0000",
    });
  });
});

describe("accentCss", () => {
  it("emits exactly the documented rules", () => {
    expect(accentCss(computeAccent("#22a7a0"))).toBe(
      ":root:root{--ml-accent-rgb:28 164 157;--ml-on-accent:#ffffff}:root:root[data-theme=light]{--ml-accent-rgb:0 124 119;--ml-on-accent:#ffffff}"
    );
  });

  it("contains no quotes or angle brackets", () => {
    for (const [base, light] of Object.values(VECTORS))
      expect(accentCss(computeAccent(base, light))).not.toMatch(/["'<>]/);
  });
});

describe("bannerTextColor", () => {
  it("picks readable text for each classification preset", () => {
    expect(bannerTextColor("#007a33")).toBe("#ffffff");
    expect(bannerTextColor("#502b85")).toBe("#ffffff");
    expect(bannerTextColor("#0033a0")).toBe("#ffffff");
    expect(bannerTextColor("#c8102e")).toBe("#ffffff");
    expect(bannerTextColor("#ff8c00")).toBe("#000000");
    expect(bannerTextColor("#fce83a")).toBe("#000000");
  });
});
