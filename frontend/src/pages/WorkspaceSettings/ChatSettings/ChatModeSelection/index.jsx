import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

export default function ChatModeSelection({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  const [chatMode, setChatMode] = useState(workspace?.chatMode || "chat");

  return (
    <div className="flex flex-col gap-y-[8px]">
      <div className="flex flex-col gap-y-[8px]">
        <label htmlFor="chatMode" className="block input-label">
          {t("chat.mode.title")}
        </label>
      </div>

      <div className="flex flex-col gap-y-[8px]">
        <div className="w-fit flex gap-x-0.5 items-center p-[3px] rounded-[11px] border border-ml-line-2 bg-ml-panel">
          <input type="hidden" name="chatMode" value={chatMode} />
          <button
            type="button"
            disabled={chatMode === "automatic"}
            onClick={() => {
              setChatMode("automatic");
              setHasChanges(true);
            }}
            className="h-9 px-4 rounded-[8px] border-none bg-transparent text-[15px] font-semibold text-ml-text-2 transition-colors duration-150 hover:text-ml-text hover:bg-ml-raised disabled:bg-ml-raised-2 disabled:text-ml-text disabled:cursor-default disabled:shadow-[inset_0_1px_0_var(--ml-inset-hi)]"
          >
            {t("chat.mode.automatic.title")}
          </button>
          <button
            type="button"
            disabled={chatMode === "chat"}
            onClick={() => {
              setChatMode("chat");
              setHasChanges(true);
            }}
            className="h-9 px-4 rounded-[8px] border-none bg-transparent text-[15px] font-semibold text-ml-text-2 transition-colors duration-150 hover:text-ml-text hover:bg-ml-raised disabled:bg-ml-raised-2 disabled:text-ml-text disabled:cursor-default disabled:shadow-[inset_0_1px_0_var(--ml-inset-hi)]"
          >
            {t("chat.mode.chat.title")}
          </button>
          <button
            type="button"
            disabled={chatMode === "query"}
            onClick={() => {
              setChatMode("query");
              setHasChanges(true);
            }}
            className="h-9 px-4 rounded-[8px] border-none bg-transparent text-[15px] font-semibold text-ml-text-2 transition-colors duration-150 hover:text-ml-text hover:bg-ml-raised disabled:bg-ml-raised-2 disabled:text-ml-text disabled:cursor-default disabled:shadow-[inset_0_1px_0_var(--ml-inset-hi)]"
          >
            {t("chat.mode.query.title")}
          </button>
        </div>
        <ChatModeExplanation chatMode={chatMode} />
      </div>
    </div>
  );
}

/**
 * A component that displays the explanation for a given chat mode.
 * @param {'automatic' | 'chat' | 'query'} chatMode - The chat mode to display the explanation for.
 * @returns {JSX.Element} The component to display the explanation for the given chat mode.
 */
function ChatModeExplanation({ chatMode = "chat" }) {
  const { t } = useTranslation();
  return (
    <p className="text-sm text-white/60">
      <b>{t(`chat.mode.${chatMode}.title`)}</b>{" "}
      <Trans
        i18nKey={`chat.mode.${chatMode}.description`}
        components={{ b: <b />, br: <br /> }}
      />
    </p>
  );
}
