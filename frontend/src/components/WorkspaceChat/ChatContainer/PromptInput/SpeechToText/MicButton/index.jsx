import { useCallback, useEffect } from "react";
import { Microphone, CircleNotch } from "@phosphor-icons/react";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import { PROMPT_INPUT_EVENT } from "../../../PromptInput";
import { COMPOSER_CHIP } from "../../../chatUi";

/**
 * Shared microphone button for all speech-to-text providers. Owns the Ctrl+M
 * shortcut and the PROMPT_INPUT_EVENT listener so each provider only has to
 * implement start/stop.
 * @param {Object} props - The component props
 * @param {boolean} props.listening - Whether the provider is actively listening
 * @param {boolean} [props.processing] - Whether a transcription request is in flight
 * @param {() => void} props.onStart - Called to begin listening
 * @param {() => void} props.onStop - Called to end listening
 * @returns {React.ReactElement} The MicButton component
 */
export default function MicButton({
  listening,
  processing = false,
  onStart,
  onStop,
}) {
  const { t } = useTranslation();

  const toggle = useCallback(() => {
    if (processing) return;
    if (listening) onStop();
    else onStart();
  }, [listening, processing, onStart, onStop]);

  useEffect(() => {
    const onKey = (event) => {
      // CTRL + m on Mac and Windows to toggle STT listening
      if (event.ctrlKey && event.keyCode === 77) toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  useEffect(() => {
    const onPromptUpdate = (e) => {
      if (!e?.detail && listening) onStop();
    };
    window.addEventListener(PROMPT_INPUT_EVENT, onPromptUpdate);
    return () => window.removeEventListener(PROMPT_INPUT_EVENT, onPromptUpdate);
  }, [listening, onStop]);

  const active = listening || processing;
  return (
    <>
      <button
        type="button"
        data-tooltip-id="tooltip-microphone-btn"
        data-tooltip-content={`${t("chat_window.microphone")} (CTRL + M)`}
        aria-label={t("chat_window.microphone")}
        aria-pressed={listening}
        onClick={toggle}
        className={`${COMPOSER_CHIP} w-ctl-lg !px-0 shrink-0 ${
          active
            ? "!bg-ml-accent-soft !text-ml-text !border-ml-accent-line"
            : ""
        }`}
      >
        {processing ? (
          <CircleNotch
            size={18}
            weight="bold"
            className="pointer-events-none animate-spin shrink-0"
          />
        ) : (
          <Microphone
            weight="regular"
            size={18}
            className={`pointer-events-none shrink-0 ${
              listening ? "animate-pulse-glow" : ""
            }`}
          />
        )}
      </button>
      <Tooltip
        id="tooltip-microphone-btn"
        place="top"
        delayShow={300}
        className="tooltip z-99"
      />
    </>
  );
}
