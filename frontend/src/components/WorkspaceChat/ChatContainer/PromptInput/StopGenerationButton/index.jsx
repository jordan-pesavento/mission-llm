import { ABORT_STREAM_EVENT } from "@/utils/chat";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

/**
 * Takes the send button's place while a reply streams: the same 40px blue
 * tile with a stop square.
 */
export default function StopGenerationButton() {
  const { t } = useTranslation();
  function emitHaltEvent() {
    window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT));
  }

  return (
    <>
      <button
        type="button"
        onClick={emitHaltEvent}
        data-tooltip-id="stop-generation-button"
        data-tooltip-content={t("chat_window.stop_generating")}
        className="w-ctl-lg h-ctl-lg shrink-0 grid place-items-center rounded-[11px] border-0 bg-ml-accent-fill cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_18px_-8px_var(--ml-accent)] hover:brightness-110 transition-[filter]"
        aria-label={t("chat_window.stop_generating")}
      >
        <span className="w-3.5 h-3.5 rounded-[4px] bg-ml-on-accent" />
      </button>
      <Tooltip
        id="stop-generation-button"
        place="top"
        delayShow={300}
        className="tooltip z-99"
      />
    </>
  );
}
