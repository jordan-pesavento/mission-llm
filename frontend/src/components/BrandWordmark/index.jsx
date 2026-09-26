import { useLayoutEffect, useRef, useState } from "react";

/**
 * Splits a product name into the wordmark's lead words and last word, in
 * capitals ("Mission LLM" -> ["MISSION", "LLM"]).
 * @param {string} name
 * @returns {[string, string]}
 */
export function wordmarkParts(name) {
  const words = String(name || "")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
  const last = words.pop() || "";
  return [words.join(" "), last];
}

/**
 * Whether a name gets the wrapping wordmark (FitWordmark): a multi-word name
 * longer than 12 characters. MISSION LLM and other short names keep their
 * single-line lockup.
 * @param {string} name
 */
export function wordmarkWraps(name) {
  const [lead] = wordmarkParts(name);
  return !!lead && String(name || "").trim().length > 12;
}

const NO_FIT = { size: null, fallback: false };

/**
 * Largest font size, from the element's own (class) size down to `minSize`
 * in 0.5px steps, at which `text` wraps onto at most `maxLines` lines at the
 * element's current width. Measured on a hidden copy of the element, so the
 * page never shows the intermediate sizes.
 * @returns {{size: number|null, fallback: boolean}|null} size null means the
 *   class size fits; fallback true means even `minSize` does not
 */
function measureFit(element, text, maxLines, minSize) {
  const width = element.getBoundingClientRect().width;
  if (!width || !element.parentNode) return null;
  const probe = document.createElement(element.tagName);
  probe.className = element.className;
  probe.textContent = text;
  probe.setAttribute("aria-hidden", "true");
  Object.assign(probe.style, {
    position: "absolute",
    left: "0",
    top: "0",
    visibility: "hidden",
    pointerEvents: "none",
    display: "block",
    width: `${width}px`,
    whiteSpace: "normal",
    overflow: "visible",
    webkitLineClamp: "none",
  });
  element.parentNode.appendChild(probe);
  try {
    const base = parseFloat(getComputedStyle(probe).fontSize);
    for (let size = base; size >= minSize - 0.01; size -= 0.5) {
      probe.style.fontSize = `${size}px`;
      const lineHeight =
        parseFloat(getComputedStyle(probe).lineHeight) || size * 1.2;
      const fitsLines =
        probe.getBoundingClientRect().height <= lineHeight * maxLines + 1;
      // A single word wider than the box does not wrap; it would be cut.
      const fitsWidth = probe.scrollWidth <= Math.ceil(width) + 1;
      if (fitsLines && fitsWidth)
        return { size: size === base ? null : size, fallback: false };
    }
    return { size: minSize, fallback: true };
  } finally {
    probe.remove();
  }
}

/**
 * Wordmark for a longer multi-word product name (see wordmarkWraps), with the
 * last word in the accent. The name wraps onto up to `maxLines` lines; when it
 * does not fit, the font shrinks in 0.5px steps down to `minSize`. A name that
 * still does not fit keeps its last (accent) word whole on the last line and
 * ends the leading words above it with an ellipsis, so the accent word always
 * shows. The full name is in the tooltip.
 *
 * The element must fill the width it may use (the caller's sizing classes,
 * for example flex-1); the base font size and line height come from
 * `className`. `maxLines={null}` wraps onto as many lines as needed.
 */
export default function FitWordmark({
  name,
  as: Tag = "span",
  className = "",
  accentAs: Accent = "b",
  accentClassName = "",
  accentStyle,
  minSize = 13,
  maxLines = 2,
}) {
  const ref = useRef(null);
  const [lead, last] = wordmarkParts(name);
  const text = lead ? `${lead} ${last}` : last;
  const [fit, setFit] = useState(NO_FIT);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !maxLines) {
      setFit(NO_FIT);
      return;
    }
    const update = () => {
      const next = measureFit(element, text, maxLines, minSize);
      if (!next) return;
      setFit((current) =>
        current.size === next.size && current.fallback === next.fallback
          ? current
          : next
      );
    };
    update();
    let active = true;
    document.fonts?.ready.then(() => active && update());
    if (typeof ResizeObserver !== "function")
      return () => {
        active = false;
      };
    // Only a width change can change the fit (the height follows the fit).
    let width = element.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = element.getBoundingClientRect().width;
      if (Math.abs(nextWidth - width) < 0.5) return;
      width = nextWidth;
      update();
    });
    observer.observe(element);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [text, maxLines, minSize]);

  const title = String(name || "").trim();
  const size = fit.size ? { fontSize: `${fit.size}px` } : null;
  const accent = (
    <Accent className={accentClassName} style={accentStyle}>
      {last}
    </Accent>
  );

  if (fit.fallback && lead) {
    return (
      <Tag
        ref={ref}
        className={`${className} min-w-0 flex flex-col`}
        style={size}
        title={title}
      >
        <span className="block min-w-0 truncate">{lead}</span>
        <span className="block min-w-0 truncate">{accent}</span>
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={`${className} min-w-0 ${maxLines ? "" : "break-words"}`}
      style={{
        ...size,
        whiteSpace: "normal",
        ...(maxLines
          ? {
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: maxLines,
              overflow: "hidden",
            }
          : null),
      }}
      title={title}
    >
      {lead ? `${lead} ` : ""}
      {accent}
    </Tag>
  );
}
