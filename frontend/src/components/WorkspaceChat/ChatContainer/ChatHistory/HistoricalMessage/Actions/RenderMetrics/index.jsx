import { formatDateTimeAsMoment } from "@/utils/directories";
import { formatDuration, numberWithCommas } from "@/utils/numbers";
import React, { useEffect, useState, useContext } from "react";
import { isMobile } from "react-device-detect";
const MetricsContext = React.createContext();
const SHOW_METRICS_KEY = "missionllm_show_chat_metrics";
const SHOW_METRICS_EVENT = "missionllm_show_metrics_change";

/**
 * Format the output TPS to a string
 * @param {number} outputTps - output TPS
 * @returns {string}
 */
function formatTps(outputTps) {
  try {
    return outputTps < 1000
      ? outputTps.toFixed(2)
      : numberWithCommas(outputTps.toFixed(0));
  } catch {
    return "";
  }
}

/**
 * Get the show metrics setting from localStorage `missionllm_show_chat_metrics` key
 * @returns {boolean}
 */
function getAutoShowMetrics() {
  return window?.localStorage?.getItem(SHOW_METRICS_KEY) === "true";
}

/**
 * Toggle the show metrics setting in localStorage `missionllm_show_chat_metrics` key
 * @returns {void}
 */
function toggleAutoShowMetrics() {
  const currentValue = getAutoShowMetrics() || false;
  window?.localStorage?.setItem(SHOW_METRICS_KEY, !currentValue);
  window.dispatchEvent(
    new CustomEvent(SHOW_METRICS_EVENT, {
      detail: { showMetricsAutomatically: !currentValue },
    })
  );
  return !currentValue;
}

/**
 * Provider for the metrics context that controls the visibility of the metrics
 * per-chat based on the user's preference.
 * @param {React.ReactNode} children
 * @returns {React.ReactNode}
 */
export function MetricsProvider({ children }) {
  const [showMetricsAutomatically, setShowMetricsAutomatically] =
    useState(getAutoShowMetrics());

  useEffect(() => {
    function handleShowingMetricsEvent(e) {
      if (!e?.detail?.hasOwnProperty("showMetricsAutomatically")) return;
      setShowMetricsAutomatically(e.detail.showMetricsAutomatically);
    }
    console.log("Adding event listener for metrics visibility");
    window.addEventListener(SHOW_METRICS_EVENT, handleShowingMetricsEvent);
    return () =>
      window.removeEventListener(SHOW_METRICS_EVENT, handleShowingMetricsEvent);
  }, []);

  return (
    <MetricsContext.Provider
      value={{ showMetricsAutomatically, setShowMetricsAutomatically }}
    >
      {children}
    </MetricsContext.Provider>
  );
}

/**
 * The monospace meta line next to the assistant name:
 * "model · N sources · 4.5s", then "61.02 tok/s · Sep 26, 4:27 AM".
 * The first part is always shown; the throughput and timestamp follow the
 * existing "show metrics" preference (always, or on hover), which a click on
 * the line toggles as before. Only real values are shown.
 * @param {{metrics: {duration:number, outputTps: number, model?: string, timestamp?: number}, sourcesLabel?: string}} props
 */
export default function RenderMetrics({ metrics = {}, sourcesLabel = "" }) {
  // Inherit the showMetricsAutomatically state from the MetricsProvider so the state is shared across all chats
  const { showMetricsAutomatically, setShowMetricsAutomatically } =
    useContext(MetricsContext) ?? {};
  const hasMetrics = !!metrics?.duration && !!metrics?.outputTps;

  const base = [
    metrics?.model || "",
    sourcesLabel,
    hasMetrics ? formatDuration(metrics.duration) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if (!base) return null;
  if (!hasMetrics || isMobile)
    return (
      <span className="min-w-0 truncate font-mono font-medium text-[13.5px] text-ml-text-3">
        {base}
      </span>
    );

  const detail = [
    `${formatTps(metrics.outputTps)} tok/s`,
    metrics?.timestamp
      ? formatDateTimeAsMoment(metrics.timestamp, "MMM D, h:mm A")
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={() => setShowMetricsAutomatically?.(toggleAutoShowMetrics())}
      data-tooltip-id="metrics-visibility"
      data-tooltip-content={
        showMetricsAutomatically
          ? "Click to only show metrics when hovering"
          : "Click to show metrics as soon as they are available"
      }
      className="min-w-0 truncate border-none bg-transparent p-0 text-left cursor-pointer font-mono font-medium text-[13.5px] text-ml-text-3 hover:text-ml-text-2 transition-colors"
    >
      {base}
      <span
        className={
          showMetricsAutomatically
            ? "inline"
            : "hidden group-hover:inline group-focus-within:inline"
        }
      >
        {" · "}
        {detail}
      </span>
    </button>
  );
}
