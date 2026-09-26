const { sniffImage } = require("../../../utils/branding/imageInfo");
const { makePng, makeJpeg, makeWebp } = require("./fixtures.cjs");

describe("sniffImage", () => {
  it("reads PNG type and size", () => {
    expect(sniffImage(makePng(300, 80))).toMatchObject({
      type: "png",
      ext: "png",
      mime: "image/png",
      width: 300,
      height: 80,
    });
  });

  it("reads JPEG size from the frame header", () => {
    expect(sniffImage(makeJpeg(640, 200))).toMatchObject({
      type: "jpeg",
      ext: "jpg",
      mime: "image/jpeg",
      width: 640,
      height: 200,
    });
  });

  it("keeps the JPEG size for EXIF orientations 1 to 4", () => {
    for (const orientation of [1, 2, 3, 4])
      expect(sniffImage(makeJpeg(640, 200, orientation))).toMatchObject({
        width: 640,
        height: 200,
      });
  });

  it("swaps the JPEG size for EXIF orientations 5 to 8", () => {
    for (const orientation of [5, 6, 7, 8]) {
      expect(sniffImage(makeJpeg(640, 200, orientation, true))).toMatchObject({
        width: 200,
        height: 640,
      });
      expect(sniffImage(makeJpeg(640, 200, orientation, false))).toMatchObject({
        width: 200,
        height: 640,
      });
    }
  });

  it("reads WebP size for lossy, lossless and extended files", () => {
    for (const kind of ["VP8", "VP8L", "VP8X"])
      expect(sniffImage(makeWebp(kind, 512, 128))).toMatchObject({
        type: "webp",
        mime: "image/webp",
        width: 512,
        height: 128,
      });
  });

  it("recognizes SVG with a prolog, comments and a BOM", () => {
    const svg = Buffer.from(
      '\uFEFF<?xml version="1.0"?>\n<!-- logo -->\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"/>'
    );
    expect(sniffImage(svg)).toMatchObject({
      type: "svg",
      mime: "image/svg+xml",
    });
  });

  it("uses the bytes, not the name: a PNG renamed .svg is a PNG", () => {
    const renamed = { originalname: "logo.svg", buffer: makePng(200, 50) };
    expect(sniffImage(renamed.buffer).type).toBe("png");
  });

  it("rejects unsupported and malformed data", () => {
    expect(
      sniffImage(Buffer.from("GIF89a\x01\x00\x01\x00", "latin1"))
    ).toBeNull();
    expect(
      sniffImage(Buffer.from("<html><body><svg></svg></body></html>"))
    ).toBeNull();
    expect(sniffImage(Buffer.from("just text"))).toBeNull();
    expect(sniffImage(makePng(10, 10).subarray(0, 12))).toBeNull();
    expect(sniffImage(Buffer.alloc(0))).toBeNull();
    expect(sniffImage("not a buffer")).toBeNull();
  });
});
