/**
 * In-process cache state for the public brand. Kept dependency-free so the
 * SystemSettings model can drop the cache after any write to a branding label
 * without a require cycle.
 */

const state = {
  entry: null, // { brand, files, at }
  inflight: null,
  generation: 0,
};

function invalidateBrand() {
  state.generation += 1;
  state.entry = null;
  state.inflight = null;
}

/**
 * Drops the cache when any of the given labels is a branding label.
 * @param {string[]} labels
 */
function invalidateForLabels(labels = []) {
  const { BRAND_LABELS } = require("./constants");
  if (labels.some((label) => BRAND_LABELS.includes(label))) invalidateBrand();
}

module.exports = { state, invalidateBrand, invalidateForLabels };
