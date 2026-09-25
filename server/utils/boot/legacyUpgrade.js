// rebrand:keep-start (this whole file reads pre-rebrand names on purpose)
const fs = require("fs");
const path = require("path");

/**
 * Upgrade shims for installs that ran before the Mission LLM rebrand.
 *
 * The upstream project persisted several names that the rebrand changed: the
 * SQLite filename, some env var names, the model router provider id and the
 * default logo filename. Without these shims an upgraded install would boot
 * against an empty database, ignore settings in its .env, or fail every chat
 * that uses the model router. Each shim only acts when a pre-rebrand value is
 * present, so it does nothing on a fresh install.
 *
 * Other pre-rebrand names are handled where they are read: the MCP config file
 * (utils/MCP/hypervisor), the agent filesystem folder (plugins/filesystem/lib),
 * the PGVector default table and the Chroma/Milvus collection prefixes
 * (utils/vectorDbProviders), the mobile device token header and the document
 * attachment mime type.
 *
 * The pre-rebrand names in this file are persisted keys, not branding.
 * Do not rename them.
 *
 * Run `node utils/boot/legacyUpgrade.js` from the server folder before any
 * `prisma migrate` command so an existing database is renamed before Prisma
 * creates a new empty one. The server also runs it on boot.
 */
const LOG_PREFIX = "\x1b[33m[LEGACY UPGRADE]\x1b[0m";

// The datasource in prisma/schema.prisma is relative to the schema file, so the
// database always lives in server/storage. STORAGE_DIR does not move it.
const DB_DIRECTORY = path.resolve(__dirname, "../../storage");
const DB_FILENAME = "missionllm.db";
const LEGACY_DB_FILENAME = "anythingllm.db";
const SQLITE_SIDECAR_SUFFIXES = ["-journal", "-wal", "-shm"];

// Pre-rebrand env var name -> current env var name.
const LEGACY_ENV_KEYS = {
  ANYTHING_LLM_RUNTIME: "MISSION_LLM_RUNTIME",
  ANYTHINGLLM_CHROMIUM_ARGS: "MISSIONLLM_CHROMIUM_ARGS",
  ANYTHINGLLM_FETCH_TIMEOUT: "MISSIONLLM_FETCH_TIMEOUT",
  ANYTHINGLLM_MAX_RETRIES: "MISSIONLLM_MAX_RETRIES",
};

const MODEL_ROUTER_PROVIDER = "missionllm-router";
const LEGACY_MODEL_ROUTER_PROVIDER = "anythingllm-router";
const LEGACY_LOGO_FILENAME = "anything-llm.png";

/**
 * Maps the pre-rebrand model router provider id to the current one.
 * Any other value is returned unchanged.
 * @param {string|null} provider
 * @returns {string|null}
 */
function normalizeLegacyProviderId(provider) {
  return provider === LEGACY_MODEL_ROUTER_PROVIDER
    ? MODEL_ROUTER_PROVIDER
    : provider;
}

/**
 * Renames a pre-rebrand SQLite database (storage/anythingllm.db) to the current
 * filename so an upgraded install keeps its users, workspaces and settings.
 * Only runs when the current database is missing or empty (0 bytes), so it
 * never replaces a database that holds data.
 * Must run before Prisma opens or migrates the database.
 * @returns {boolean} true if the legacy database was renamed.
 */
function migrateLegacyDatabaseFile() {
  const legacyPath = path.join(DB_DIRECTORY, LEGACY_DB_FILENAME);
  const currentPath = path.join(DB_DIRECTORY, DB_FILENAME);

  try {
    if (!fs.existsSync(legacyPath)) return false;

    const currentHasData =
      fs.existsSync(currentPath) && fs.statSync(currentPath).size > 0;
    const currentHasSidecars = SQLITE_SIDECAR_SUFFIXES.some((suffix) =>
      fs.existsSync(`${currentPath}${suffix}`)
    );
    if (currentHasData || currentHasSidecars) {
      console.warn(
        `${LOG_PREFIX} Found a pre-rebrand database at ${legacyPath}, but ${currentPath} is already in use, so the old file was left untouched. If this instance should use the old data, stop the server, rename ${LEGACY_DB_FILENAME} to ${DB_FILENAME} (replacing the newer file), and start the server again.`
      );
      return false;
    }

    // Move any journal/WAL files first so the database never appears under
    // its new name without them.
    for (const suffix of SQLITE_SIDECAR_SUFFIXES) {
      if (fs.existsSync(`${legacyPath}${suffix}`))
        fs.renameSync(`${legacyPath}${suffix}`, `${currentPath}${suffix}`);
    }
    fs.renameSync(legacyPath, currentPath);
    console.log(
      `${LOG_PREFIX} Renamed database ${LEGACY_DB_FILENAME} to ${DB_FILENAME} in ${DB_DIRECTORY}.`
    );
    return true;
  } catch (e) {
    console.error(
      `${LOG_PREFIX} Could not rename ${legacyPath} to ${currentPath}:`,
      e.message
    );
    return false;
  }
}

/**
 * Copies values set under pre-rebrand env var names to their current names
 * (only when the current name is unset) and maps a pre-rebrand LLM_PROVIDER
 * value. The next settings save writes them to .env under the current names.
 * Must run before any module reads these env vars.
 */
function migrateLegacyEnv() {
  for (const [legacyKey, currentKey] of Object.entries(LEGACY_ENV_KEYS)) {
    if (!process.env[legacyKey] || process.env[currentKey]) continue;
    process.env[currentKey] = process.env[legacyKey];
    console.log(
      `${LOG_PREFIX} ${legacyKey} is deprecated. Using its value for ${currentKey}. Rename it in your .env file.`
    );
  }

  if (process.env.LLM_PROVIDER === LEGACY_MODEL_ROUTER_PROVIDER) {
    process.env.LLM_PROVIDER = MODEL_ROUTER_PROVIDER;
    console.log(
      `${LOG_PREFIX} LLM_PROVIDER "${LEGACY_MODEL_ROUTER_PROVIDER}" is deprecated. Using "${MODEL_ROUTER_PROVIDER}".`
    );
  }
}

/**
 * Rewrites pre-rebrand values stored in the database: the model router
 * provider id on workspaces and the seeded default logo filename.
 * Safe to run on every boot; it only updates rows that still hold old values.
 * @returns {Promise<void>}
 */
async function migrateLegacyRecords() {
  try {
    const prisma = require("../prisma");
    const { LOGO_FILENAME } = require("../files/logo");

    const chatProviders = await prisma.workspaces.updateMany({
      where: { chatProvider: LEGACY_MODEL_ROUTER_PROVIDER },
      data: { chatProvider: MODEL_ROUTER_PROVIDER },
    });
    const agentProviders = await prisma.workspaces.updateMany({
      where: { agentProvider: LEGACY_MODEL_ROUTER_PROVIDER },
      data: { agentProvider: MODEL_ROUTER_PROVIDER },
    });
    if (chatProviders.count + agentProviders.count > 0)
      console.log(
        `${LOG_PREFIX} Updated workspace provider "${LEGACY_MODEL_ROUTER_PROVIDER}" to "${MODEL_ROUTER_PROVIDER}" (${chatProviders.count} chat, ${agentProviders.count} agent).`
      );

    const logo = await prisma.system_settings.updateMany({
      where: { label: "logo_filename", value: LEGACY_LOGO_FILENAME },
      data: { value: LOGO_FILENAME },
    });
    if (logo.count > 0)
      console.log(
        `${LOG_PREFIX} Updated default logo filename "${LEGACY_LOGO_FILENAME}" to "${LOGO_FILENAME}".`
      );

    // Connect to PGVector once in the background so a pre-rebrand default table
    // is picked up (see PGVector.connect) before the settings page reads the
    // table name. Not awaited: the database may be slow or unreachable.
    if (
      process.env.VECTOR_DB === "pgvector" &&
      !process.env.PGVECTOR_TABLE_NAME
    ) {
      const { PGVector } = require("../vectorDbProviders/pgvector");
      new PGVector()
        .connect()
        .then((client) => client.end())
        .catch(() => {});
    }
  } catch (e) {
    console.error(
      `${LOG_PREFIX} Error updating pre-rebrand database values:`,
      e.message
    );
  }
}

module.exports = {
  normalizeLegacyProviderId,
  migrateLegacyDatabaseFile,
  migrateLegacyEnv,
  migrateLegacyRecords,
};

// Allows running the database rename on its own before `prisma migrate`.
if (require.main === module) migrateLegacyDatabaseFile();
// rebrand:keep-end
