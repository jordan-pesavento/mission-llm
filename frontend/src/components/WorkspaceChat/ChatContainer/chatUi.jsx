/**
 * Shared class names and small helpers for the chat view (concept 1).
 * Colors come from the --ml-* tokens so both themes follow automatically.
 */
import { useEffect, useState } from "react";
import System from "@/models/system";

const DEFAULT_ASSISTANT_NAME = "Mission LLM";
let assistantNameCache = null;

/**
 * Name shown above assistant replies: the instance's custom app name when an
 * admin set one, otherwise "Mission LLM". Fetched once per page load.
 * @returns {string}
 */
export function useAssistantName() {
  const [name, setName] = useState(
    assistantNameCache ?? DEFAULT_ASSISTANT_NAME
  );
  useEffect(() => {
    if (assistantNameCache !== null) return;
    let cancelled = false;
    System.fetchCustomAppName()
      .then(({ appName }) => {
        assistantNameCache = appName?.trim() || DEFAULT_ASSISTANT_NAME;
        if (!cancelled) setName(assistantNameCache);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return name;
}

// 38px bordered control used in the top bar (model pill, Sources, more).
export const TOPBAR_CTL =
  "h-ctl inline-flex items-center gap-[9px] px-3 rounded-[10px] border border-ml-line-2 bg-ml-panel whitespace-nowrap cursor-pointer transition-colors duration-150 hover:border-ml-accent-line";

// 38px square icon button (drawer close, collapse, more).
export const ICON_BTN =
  "w-ctl h-ctl grid place-items-center shrink-0 rounded-[10px] border border-transparent bg-transparent text-ml-text-2 cursor-pointer transition-colors duration-150 hover:bg-ml-raised hover:text-ml-text hover:border-ml-line";

// 36px icon button used in the message action row.
export const ACT_BTN =
  "w-9 h-9 grid place-items-center shrink-0 rounded-[10px] border border-transparent bg-transparent text-ml-text-2 cursor-pointer transition-colors duration-150 hover:bg-ml-raised hover:text-ml-text hover:border-ml-line disabled:cursor-default disabled:opacity-60";

// 40px composer chip (Attach, Agent, Tools, mic).
export const COMPOSER_CHIP =
  "h-ctl-lg inline-flex items-center justify-center gap-[7px] px-[13px] rounded-[11px] border border-ml-line bg-transparent text-ml-text-2 font-semibold text-[14.5px] whitespace-nowrap cursor-pointer transition-colors duration-150 hover:bg-ml-raised-2 hover:text-ml-text";

// Popover menu surface (chat settings, model picker, action menus).
export const MENU_SURFACE =
  "bg-ml-raised border border-ml-line-2 rounded-[12px] shadow-ml-pop";

// Menu row inside a MENU_SURFACE.
export const MENU_ROW =
  "w-full h-10 flex items-center gap-x-2.5 px-3 rounded-[9px] text-[14.5px] text-ml-text-2 text-left cursor-pointer transition-colors duration-150 hover:bg-ml-raised-2 hover:text-ml-text";

const INITIALS_STOP_WORDS = new Set([
  "and",
  "of",
  "the",
  "for",
  "a",
  "an",
  "to",
  "in",
]);

/**
 * Two-letter tile for a workspace, shared by the rail, the chat top bar and
 * workspace settings. An all-caps acronym in the name wins ("Policy and HR"
 * -> HR), otherwise the first letters of the first two meaningful words
 * ("Engineering Specs" -> ES), or the first two letters of a single word.
 * @param {string} name
 * @returns {string}
 */
export function initialsFor(name = "") {
  const words = String(name)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  const acronym = words.find(
    (w) =>
      w.length >= 2 &&
      w.length <= 4 &&
      w === w.toUpperCase() &&
      /\p{Lu}/u.test(w)
  );
  if (acronym) return acronym.slice(0, 2);
  const meaningful = words.filter(
    (w) => !INITIALS_STOP_WORDS.has(w.toLowerCase())
  );
  const list = meaningful.length ? meaningful : words;
  if (list.length === 1) return list[0].slice(0, 2).toUpperCase();
  return (list[0][0] + list[1][0]).toUpperCase();
}

/**
 * Converts a chat timestamp (seconds or milliseconds, number or string) to a
 * Date, or null when it is missing or invalid.
 * @param {number|string|undefined} value
 * @returns {Date|null}
 */
export function toDate(value) {
  if (value === null || value === undefined || value === "") return null;
  let ms = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(ms)) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : new Date(parsed);
  }
  if (ms < 1e12) ms *= 1000; // seconds
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * "09:41" in the viewer's locale with a 24-hour clock, as in the concept.
 * @param {Date} date
 * @param {string} [locale]
 */
export function formatClock(date, locale) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * "Today", "Yesterday" or a short date ("Sep 24"), localized.
 * @param {Date} date
 * @param {string} [locale]
 */
export function formatDay(date, locale) {
  try {
    const startOf = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((startOf(date) - startOf(new Date())) / 864e5);
    if (diffDays === 0 || diffDays === -1) {
      const label = new Intl.RelativeTimeFormat(locale, {
        numeric: "auto",
      }).format(diffDays, "day");
      return label.charAt(0).toLocaleUpperCase(locale) + label.slice(1);
    }
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * Day key used to decide where a day divider goes.
 * @param {Date} date
 */
export function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * The delta mark from the Mission LLM emblem, drawn in currentColor with a
 * navy cutout. Used for the assistant avatar tile.
 */
export function DeltaMark({ className = "" }) {
  return (
    <svg
      viewBox="140 136 232 232"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M256 148 L360 358 L256 312 L152 358 Z" fill="currentColor" />
      <path d="M256 214 L316 336 L256 315 L196 336 Z" fill="#0B1731" />
    </svg>
  );
}

/**
 * 36px navy assistant avatar tile (the same in both themes, as in the concept).
 */
export function AssistantAvatar() {
  return (
    <div
      aria-hidden="true"
      className="w-9 h-9 shrink-0 grid place-items-center rounded-[11px] border border-[rgba(169,186,214,0.38)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,#173063,#070F26)]"
    >
      <DeltaMark className="w-[21px] h-[21px] text-[#DDE6F6]" />
    </div>
  );
}

/**
 * Numbered badge ("1", "2") used on source chips and drawer cards.
 */
export function NumberBadge({ children }) {
  return (
    <span className="w-[26px] h-[26px] shrink-0 grid place-items-center rounded-[7px] bg-ml-accent-soft text-ml-accent-text font-mono font-semibold text-[13px] leading-none">
      {children}
    </span>
  );
}
