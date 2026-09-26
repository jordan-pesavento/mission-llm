/** @type {import('jest').Config} */
module.exports = {
  testPathIgnorePatterns: [
    "/node_modules/",
    "/open-computer/",
    // Shared test helpers, not suites (jest 30 also collects .cjs files).
    "/__tests__/.*/fixtures\\.cjs$",
  ],
};
