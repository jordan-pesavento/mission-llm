const multer = require("multer");
const { reqBody } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  getBrand,
  getAssetFile,
  getAdminBrand,
  updateBrandValues,
  setAsset,
  removeAsset,
  resetBranding,
  UploadError,
} = require("../utils/branding");
const {
  SLOT_CONFIG,
  SERVE_SLOTS,
  MAX_UPLOAD_BYTES,
} = require("../utils/branding/constants");

const SVG_CSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox";

/**
 * Multipart fields an upload slot accepts: the source file, plus the PNG
 * variants the browser generates for the icon.
 * @param {string} slot
 * @returns {string[]}
 */
function uploadFields(slot) {
  const rule = SLOT_CONFIG[slot];
  if (!rule) return [];
  return [rule.field, ...Object.keys(rule.variants || {})];
}

/**
 * Parses a branding upload into memory. Nothing touches the disk until the
 * files pass validation. Unexpected fields, repeated fields and oversized
 * files end the request with a JSON error.
 */
function handleBrandingUpload(request, response, next) {
  const fields = uploadFields(request.params.slot);
  if (!fields.length)
    return response
      .status(404)
      .json({ success: false, error: "upload_failed", detail: "unknown slot" });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_UPLOAD_BYTES,
      files: fields.length,
      fields: 10,
      fieldSize: 1024,
      parts: fields.length + 10,
    },
    fileFilter: (_request, file, cb) => {
      if (!fields.includes(file.fieldname))
        return cb(
          new UploadError("upload_failed", `unexpected field ${file.fieldname}`)
        );
      cb(null, true);
    },
  }).any();

  upload(request, response, function (error) {
    if (error) {
      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      )
        return response
          .status(413)
          .json({ success: false, error: "too_large", detail: error.field });
      return response.status(400).json({
        success: false,
        error: "upload_failed",
        detail:
          error instanceof UploadError ? error.detail : error.code || null,
      });
    }

    const filesByField = {};
    for (const file of request.files || []) {
      if (filesByField[file.fieldname])
        return response.status(400).json({
          success: false,
          error: "upload_failed",
          detail: `repeated field ${file.fieldname}`,
        });
      filesByField[file.fieldname] = file;
    }
    request.brandingFiles = filesByField;
    next();
  });
}

function uploadErrorResponse(response, error) {
  if (error instanceof UploadError)
    return response.status(error.status || 400).json({
      success: false,
      error: error.code,
      ...(error.detail ? { detail: error.detail } : {}),
    });
  console.error("[branding] request failed:", error);
  return response.status(500).json({ success: false, error: "upload_failed" });
}

function brandingEndpoints(app) {
  if (!app) return;

  // Public: the sign-in page needs the brand before anyone is signed in.
  // Never includes support_email or footer_data.
  app.get("/system/branding", async (request, response) => {
    try {
      const brand = await getBrand();
      response.set({
        ETag: `"${brand.version}"`,
        "Cache-Control": "no-cache",
      });
      if (request.fresh) return response.status(304).end();
      return response.status(200).json(brand);
    } catch (error) {
      console.error("[branding] could not build the brand:", error);
      return response.status(500).json({ error: "branding_unavailable" });
    }
  });

  app.get("/system/branding/asset/:slot", async (request, response) => {
    try {
      const { slot } = request.params;
      if (!SERVE_SLOTS.includes(slot)) return response.sendStatus(404);
      const file = await getAssetFile(slot);
      if (!file || !file.mime) return response.sendStatus(404);

      const immutable = request.query?.v === file.hash;
      const headers = {
        "Content-Type": file.mime,
        "Content-Length": file.buffer.length,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": immutable
          ? "public, max-age=31536000, immutable"
          : "no-cache",
        ETag: `"${file.hash}"`,
      };
      if (file.mime === "image/svg+xml")
        headers["Content-Security-Policy"] = SVG_CSP;
      response.set(headers);
      if (request.fresh) return response.status(304).end();
      return response.status(200).end(file.buffer);
    } catch (error) {
      console.error("[branding] could not serve an asset:", error);
      return response.sendStatus(500);
    }
  });

  app.get(
    "/admin/branding",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_request, response) => {
      try {
        return response.status(200).json(await getAdminBrand());
      } catch (error) {
        console.error("[branding] could not read branding:", error);
        return response.status(500).json({ error: "branding_unavailable" });
      }
    }
  );

  app.post(
    "/admin/branding",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { values } = reqBody(request) || {};
        const result = await updateBrandValues(values);
        if (!result.success)
          return response
            .status(400)
            .json({ success: false, errors: result.errors });

        if (result.changed.length)
          await EventLogs.logEvent(
            "branding_updated",
            { fields: result.changed },
            response.locals?.user?.id
          );
        return response.status(200).json({
          success: true,
          brand: result.brand,
          values: result.values,
        });
      } catch (error) {
        console.error("[branding] could not save branding:", error);
        return response
          .status(500)
          .json({ success: false, error: "save_failed" });
      }
    }
  );

  app.post(
    "/admin/branding/asset/:slot",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.admin, ROLES.manager]),
      handleBrandingUpload,
    ],
    async (request, response) => {
      try {
        const { slot } = request.params;
        const brand = await setAsset(slot, request.brandingFiles);
        await EventLogs.logEvent(
          "branding_asset_updated",
          { slot, action: "upload" },
          response.locals?.user?.id
        );
        return response.status(200).json({ success: true, brand });
      } catch (error) {
        return uploadErrorResponse(response, error);
      }
    }
  );

  app.delete(
    "/admin/branding/asset/:slot",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slot } = request.params;
        if (!SLOT_CONFIG[slot])
          return response.status(404).json({
            success: false,
            error: "upload_failed",
            detail: "unknown slot",
          });
        const { brand, removed } = await removeAsset(slot);
        if (removed)
          await EventLogs.logEvent(
            "branding_asset_updated",
            { slot, action: "remove" },
            response.locals?.user?.id
          );
        return response.status(200).json({ success: true, brand });
      } catch (error) {
        return uploadErrorResponse(response, error);
      }
    }
  );

  app.post(
    "/admin/branding/reset",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { confirm, includeLinks = false } = reqBody(request) || {};
        if (confirm !== "RESET")
          return response
            .status(400)
            .json({ success: false, error: "confirm_required" });

        const { brand, changed, backup } = await resetBranding({
          includeLinks: includeLinks === true,
        });
        await EventLogs.logEvent(
          "branding_reset",
          {
            includeLinks: includeLinks === true,
            fields: changed,
            backedUpFiles: backup.files.length,
          },
          response.locals?.user?.id
        );
        return response.status(200).json({ success: true, brand });
      } catch (error) {
        console.error("[branding] reset failed:", error);
        return response
          .status(500)
          .json({ success: false, error: "reset_failed" });
      }
    }
  );
}

module.exports = { brandingEndpoints, handleBrandingUpload };
