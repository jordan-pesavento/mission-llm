import { decode as HTMLDecode } from "he";
import { useTranslation } from "react-i18next";
import {
  getCustomImage,
  omitChunkHeader,
  parseChunkSource,
  SourceTypeCircle,
} from "../../ChatHistory/Citation";
import { NumberBadge } from "../../chatUi";

/**
 * Best retrieval score among a source's cited chunks, or null when the
 * vector database did not report one.
 * @param {{chunks: {score: number|null}[]}} source
 * @returns {number|null}
 */
function bestScore(source) {
  const scores = (source?.chunks ?? [])
    .map((chunk) => Number(chunk?.score))
    .filter((score) => Number.isFinite(score));
  if (scores.length === 0) return null;
  return Math.max(...scores);
}

/**
 * First cited passage of a source as plain text, without the metadata header
 * and the embedder's "search_document:" prefix.
 */
function excerptFor(source) {
  const text = source?.chunks?.[0]?.text;
  if (!text) return "";
  return HTMLDecode(omitChunkHeader(String(text)))
    .replace(/^search_document:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A numbered card in the Sources drawer: file name, monospace location or
 * reference count, a four-line excerpt and the real match score.
 */
export default function SourceItem({
  source,
  number,
  highlighted = false,
  onClick,
}) {
  const { t } = useTranslation();
  const info = parseChunkSource(source);
  // Same facts as before the redesign: "Document" (or the web address) and
  // the number of cited passages. Files carry no page or section data.
  const sub = [
    info?.isUrl ? info.text : t("chat_window.document"),
    t("chat_window.source_count", { count: source.references }),
  ]
    .filter(Boolean)
    .join(" · ");
  const excerpt = excerptFor(source);
  const score = bestScore(source);
  const pct = score === null ? 0 : Math.max(0, Math.min(1, score)) * 100;

  // The whole card is clickable through the title button's stretched hit
  // area; the excerpt stays plain text.
  return (
    <article
      data-source-title={source.title}
      aria-current={highlighted ? "true" : undefined}
      className={`relative w-full shrink-0 text-left flex flex-col gap-2.5 p-3.5 rounded-[14px] border bg-ml-panel cursor-pointer transition-[border-color,box-shadow] duration-200 [&:has(:focus-visible)]:border-ml-accent-line [&:has(:focus-visible)]:shadow-[0_0_0_3px_var(--ml-accent-soft)] ${
        highlighted
          ? "border-ml-accent-line shadow-[0_0_0_3px_var(--ml-accent-soft)]"
          : "border-ml-line hover:border-ml-accent-line"
      }`}
    >
      <div className="flex gap-3 items-center min-w-0 w-full">
        <NumberBadge>{number}</NumberBadge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {info?.icon && info.icon !== "file" && (
              <SourceTypeCircle
                type={info.icon}
                size={16}
                iconSize={10}
                url={info.href}
                customImage={getCustomImage(info.icon)}
              />
            )}
            <button
              type="button"
              onClick={onClick}
              className="block min-w-0 flex-1 text-left font-semibold text-[15px] leading-snug text-ml-text truncate cursor-pointer focus-visible:outline-none after:content-[''] after:absolute after:inset-0 after:rounded-[14px]"
              title={source.title}
            >
              {source.title}
            </button>
          </div>
          {sub && (
            <p className="font-mono font-medium text-[13.5px] leading-snug text-ml-text-3 truncate">
              {sub}
            </p>
          )}
        </div>
      </div>
      {excerpt && (
        <p className="text-[15px] leading-[1.55] text-ml-text-2 line-clamp-4 break-words">
          {excerpt}
        </p>
      )}
      {score !== null && (
        <div className="w-full flex items-center gap-2.5 font-mono font-medium text-[13px] text-ml-text-3">
          <span>{t("chat_window.source_match")}</span>
          <span
            className="flex-1 h-[5px] rounded-[5px] bg-ml-raised-2 overflow-hidden"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Number(score.toFixed(2))}
            aria-label={t("chat_window.source_match")}
          >
            <span
              className="block h-full rounded-[5px] bg-ml-accent"
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="tabular-nums">{score.toFixed(2)}</span>
        </div>
      )}
    </article>
  );
}
