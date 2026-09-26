import React, { memo, useLayoutEffect, useRef, useState } from "react";
import { Info, Warning } from "@phosphor-icons/react";
import Actions from "./Actions";
import renderMarkdown from "@/utils/chat/markdown";
import Citations, { combineLikeSources } from "../Citation";
import RenderMetrics from "./Actions/RenderMetrics";
import useUser from "@/hooks/useUser";
import {
  AssistantAvatar,
  formatClock,
  toDate,
  useAssistantName,
} from "../../chatUi";
import { v4 } from "uuid";
import DOMPurify from "@/utils/chat/purify";
import { EditMessageForm, useEditMessage } from "./Actions/EditMessage";
import { useWatchDeleteMessage } from "./Actions/DeleteMessage";
import TTSMessage from "./Actions/TTSButton";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
} from "../ThoughtContainer";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { chatQueryRefusalResponse } from "@/utils/chat";
import HistoricalOutputs from "./HistoricalOutputs";
import HistoricalClarifyingQuestions from "./HistoricalClarifyingQuestions";
import { openImageLightbox } from "@/components/ImageLightbox";

function hasVisibleContent(message) {
  if (!message) return false;
  const stripped = message
    .replace(new RegExp(THOUGHT_REGEX_COMPLETE, "g"), "")
    .trim();
  if (!stripped) return false;
  if (
    stripped.match(THOUGHT_REGEX_OPEN) &&
    !stripped.match(THOUGHT_REGEX_CLOSE)
  )
    return false;
  return true;
}

const HistoricalMessage = ({
  uuid: uuidProp,
  message,
  role,
  workspace,
  sources = [],
  attachments = [],
  error = false,
  feedbackScore = null,
  chatId = null,
  isLastMessage = false,
  regenerateMessage,
  saveEditedMessage,
  forkThread,
  metrics = {},
  outputs = [],
  clarifyingQuestions = [],
  sentAt = null,
}) => {
  // Freeze uuid on first render. User messages arrive without a uuid and this value
  // is used as the wrapper div's `key` — a default param fallback would regenerate
  // on every render and remount the subtree, wiping TruncatableContent state.
  const [uuid] = useState(() => uuidProp ?? v4());
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const { isEditing } = useEditMessage({ chatId, role });
  const { isDeleted, completeDelete, onEndAnimation } = useWatchDeleteMessage({
    chatId,
    role,
  });
  const adjustTextArea = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const isRefusalMessage =
    role === "assistant" && message === chatQueryRefusalResponse(workspace);

  if (completeDelete) return null;

  if (!!error) {
    return (
      <AssistantFrame key={uuid}>
        <div
          role="alert"
          className="rounded-[14px] border border-ml-bad/40 bg-ml-bad-soft px-4 py-3 text-[15px] text-ml-text"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Warning size={18} className="shrink-0 text-ml-bad" />
            {t("chat_window.response_failed")}
          </span>
          <p className="mt-2 font-mono text-[13.5px] text-ml-text-2 break-words">
            {error}
          </p>
        </div>
      </AssistantFrame>
    );
  }

  if (role === "user") {
    const sent = toDate(sentAt);
    const userMeta = [
      user?.username,
      sent ? formatClock(sent, i18n?.language) : "",
    ]
      .filter(Boolean)
      .join(" · ");

    if (isEditing) {
      return (
        <div key={uuid} className="flex justify-end w-full">
          <EditMessageForm
            role={role}
            chatId={chatId}
            message={message}
            attachments={attachments}
            adjustTextArea={adjustTextArea}
            saveChanges={saveEditedMessage}
          />
        </div>
      );
    }

    return (
      <div
        key={uuid}
        onAnimationEnd={onEndAnimation}
        className={`${isDeleted ? "animate-remove" : ""} flex justify-end w-full group`}
      >
        <div
          data-align="chat:right"
          className="flex flex-col items-end min-w-0 max-w-[min(680px,88%)]"
        >
          <div className="max-w-full min-w-0 rounded-[18px_18px_6px_18px] border border-[color:var(--ml-bubble-line)] [background:var(--ml-bubble)] shadow-[inset_0_1px_0_var(--ml-inset-hi)] px-[18px] py-[14px] leading-[1.6] text-ml-text break-words">
            <TruncatableContent>
              <RenderChatContent
                role={role}
                message={message}
                messageId={uuid}
              />
              <ChatAttachments attachments={attachments} />
            </TruncatableContent>
          </div>
          <div className="mt-[7px] flex items-center justify-end gap-2 min-h-9">
            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              <Actions
                message={message}
                feedbackScore={feedbackScore}
                chatId={chatId}
                slug={workspace?.slug}
                isLastMessage={isLastMessage}
                regenerateMessage={regenerateMessage}
                isEditing={isEditing}
                role={role}
                forkThread={forkThread}
              />
            </div>
            {userMeta && (
              <span className="font-mono font-medium text-[13.5px] text-ml-text-3 whitespace-nowrap">
                {userMeta}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const combinedCount = sources?.length
    ? combineLikeSources(sources).length
    : 0;
  const sourcesLabel = combinedCount
    ? t("chat_window.source_total", { count: combinedCount })
    : "";

  return (
    <AssistantFrame
      key={uuid}
      onAnimationEnd={onEndAnimation}
      className={isDeleted ? "animate-remove" : ""}
      meta={<RenderMetrics metrics={metrics} sourcesLabel={sourcesLabel} />}
    >
      {isEditing ? (
        <EditMessageForm
          role={role}
          chatId={chatId}
          message={message}
          attachments={attachments}
          adjustTextArea={adjustTextArea}
          saveChanges={saveEditedMessage}
        />
      ) : (
        <div className="break-words">
          <HistoricalClarifyingQuestions surveys={clarifyingQuestions} />
          <RenderChatContent role={role} message={message} />
          {isRefusalMessage && (
            <Link
              data-tooltip-id="query-refusal-info"
              data-tooltip-content={`${t("chat.refusal.tooltip-description")}`}
              className="!no-underline group/refusal mt-3 !flex w-fit"
              to={paths.chatModes()}
              target="_blank"
            >
              <span className="flex flex-row items-center gap-x-1.5 text-ml-text-3 group-hover/refusal:text-ml-text-2">
                <Info size={16} />
                <span className="text-[13.5px] cursor-pointer">
                  {t("chat.refusal.tooltip-title")}
                </span>
              </span>
            </Link>
          )}
          <ChatAttachments attachments={attachments} />
          <HistoricalOutputs outputs={outputs} />
        </div>
      )}
      {role === "assistant" && <Citations sources={sources} />}
      {hasVisibleContent(message) && (
        <div className="mt-2.5 -ml-2">
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            ttsSlot={
              <TTSMessage
                slug={workspace?.slug}
                chatId={chatId}
                message={message}
              />
            }
          />
        </div>
      )}
    </AssistantFrame>
  );
};

/**
 * Assistant message layout: the 36px navy delta tile, then the name with the
 * monospace meta line, the reply, source chips and the action row.
 */
export function AssistantFrame({
  children,
  meta = null,
  className = "",
  onAnimationEnd,
}) {
  const assistantName = useAssistantName();
  return (
    <div
      onAnimationEnd={onAnimationEnd}
      className={`${className} grid grid-cols-[36px_minmax(0,1fr)] gap-3.5 w-full group`}
    >
      <AssistantAvatar />
      <div className="min-w-0">
        <div className="flex items-baseline gap-x-3 min-w-0 mt-[5px] mb-2.5 leading-normal whitespace-nowrap">
          <span className="shrink-0 font-bold text-[15.5px] text-ml-text">
            {assistantName}
          </span>
          {meta}
        </div>
        {children}
      </div>
    </div>
  );
}

export default memo(
  HistoricalMessage,
  // Skip re-render the historical message:
  // - if the content is the exact same
  // - AND (not streaming)
  // - the lastMessage status is the same (regen icon)
  // - the chatID matches between renders. (feedback icons)
  // - the metrics are the same (metrics are updated in real time)
  (prevProps, nextProps) => {
    return (
      prevProps.message === nextProps.message &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.chatId === nextProps.chatId &&
      JSON.stringify(prevProps.metrics) === JSON.stringify(nextProps.metrics) &&
      JSON.stringify(prevProps.sources) === JSON.stringify(nextProps.sources) &&
      JSON.stringify(prevProps.clarifyingQuestions) ===
        JSON.stringify(nextProps.clarifyingQuestions)
    );
  }
);

/**
 * Currently only renders image attachments as clickable thumbnails that open in the lightbox.
 * Other attachment types may be supported here in the future.
 */
function ChatAttachments({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-4 mt-4">
      {attachments.map((item, index) => (
        <button
          type="button"
          key={item.name}
          onClick={() => openImageLightbox(attachments, index)}
          className="p-0 border-none bg-transparent cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            alt={`Attachment: ${item.name}`}
            src={item.contentString}
            className="w-[120px] h-[120px] object-cover rounded-lg"
          />
        </button>
      ))}
    </div>
  );
}

function TruncatableContent({ children }) {
  const contentRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const { t } = useTranslation();

  // useLayoutEffect (not useEffect) so collapse applies before paint — avoids a
  // one-frame flash of uncollapsed content on mount.
  useLayoutEffect(() => {
    if (contentRef.current) {
      setIsOverflowing(contentRef.current.scrollHeight > 250);
    }
  }, []);

  const showTruncation = !isExpanded && isOverflowing;

  return (
    <>
      <div
        ref={contentRef}
        className={showTruncation ? "max-h-[250px] overflow-hidden" : ""}
        style={
          showTruncation
            ? {
                // Fade the last lines into the bubble, whatever its color.
                maskImage:
                  "linear-gradient(180deg, #000 0%, #000 calc(100% - 44px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(180deg, #000 0%, #000 calc(100% - 44px), transparent 100%)",
              }
            : undefined
        }
      >
        {children}
      </div>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-[13.5px] font-semibold text-ml-accent-text hover:underline"
        >
          {isExpanded ? t("chat_window.see_less") : t("chat_window.see_more")}
        </button>
      )}
    </>
  );
}

const RenderChatContent = memo(
  ({ role, message }) => {
    // If the message is not from the assistant, we can render it directly
    // as normal since the user cannot think (lol)
    if (role !== "assistant")
      return (
        <div
          className="text-ml-text"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(message)),
          }}
        />
      );
    if (!message) return null;

    // Thought segments are rendered by the activity chain (buildMessages
    // splits them out) - this only renders the visible remainder.
    if (
      message.match(THOUGHT_REGEX_OPEN) &&
      !message.match(THOUGHT_REGEX_CLOSE)
    )
      return null;
    const msgToRender = message.replace(THOUGHT_REGEX_COMPLETE, "");
    if (!msgToRender.trim().length) return null;

    return (
      <div
        className="text-ml-text"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(renderMarkdown(msgToRender)),
        }}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.role === nextProps.role &&
      prevProps.message === nextProps.message
    );
  }
);
