import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Warning } from "@phosphor-icons/react";
import renderMarkdown from "@/utils/chat/markdown";
import DOMPurify from "@/utils/chat/purify";
import Citations, { combineLikeSources } from "../Citation";
import { AssistantFrame } from "../HistoricalMessage";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
} from "../ThoughtContainer";

/**
 * The assistant reply while it streams. Same frame as a finished answer
 * (avatar, name, meta) so nothing jumps when the history reloads.
 */
const PromptReply = ({ uuid, reply, pending, error, sources = [] }) => {
  const { t } = useTranslation();
  if (!reply && sources.length === 0 && !pending && !error) return null;

  if (pending) {
    return (
      <AssistantFrame>
        {/*
          The animation below is the only signal that a reply is coming, and it
          is purely visual. The status region gives a screen reader user the
          same information. It carries the text rather than wrapping the
          animation so that it announces once, on appearance, instead of on
          every repaint.
        */}
        <span className="sr-only" role="status">
          {t("chat_window.generating_response")}
        </span>
        <div
          className="mt-3 ml-3 dot-falling light:invert"
          aria-hidden="true"
        ></div>
      </AssistantFrame>
    );
  }

  if (error) {
    return (
      <AssistantFrame>
        {/*
          role="alert" rather than "status": a failed reply is the one case
          where the user needs interrupting, because nothing else on the page
          changes to tell them the turn ended.
        */}
        <div
          role="alert"
          className="rounded-[14px] border border-ml-bad/40 bg-ml-bad-soft px-4 py-3 text-[15px] text-ml-text"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Warning size={18} className="shrink-0 text-ml-bad" />
            {t("chat_window.response_failed")}
          </span>
          <p className="mt-2 font-mono text-[13.5px] text-ml-text-2 break-words">
            {t("chat_window.response_failed_reason", {
              reason: error || "unknown",
            })}
          </p>
        </div>
      </AssistantFrame>
    );
  }

  const combinedCount = sources?.length
    ? combineLikeSources(sources).length
    : 0;

  return (
    <AssistantFrame
      key={uuid}
      meta={
        combinedCount > 0 ? (
          <span className="min-w-0 truncate font-mono font-medium text-[13.5px] text-ml-text-3">
            {t("chat_window.source_total", { count: combinedCount })}
          </span>
        ) : null
      }
    >
      <RenderAssistantChatContent
        key={`${uuid}-prompt-reply-content`}
        message={reply}
      />
      <Citations sources={sources} />
    </AssistantFrame>
  );
};

function RenderAssistantChatContent({ message }) {
  // Thought segments are rendered by the activity chain (buildMessages splits
  // them out) - this only renders the visible remainder of the reply.
  if (message.match(THOUGHT_REGEX_OPEN) && !message.match(THOUGHT_REGEX_CLOSE))
    return null;
  const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");
  if (!msgToRender.trim().length) return null;

  return (
    <div
      className="break-words text-ml-text"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(renderMarkdown(msgToRender)),
      }}
    />
  );
}

export default memo(PromptReply);
