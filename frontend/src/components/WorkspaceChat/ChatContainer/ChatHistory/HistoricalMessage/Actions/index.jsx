import React, { memo, useState } from "react";
import useCopyText from "@/hooks/useCopyText";
import { Check, ThumbsUp, ArrowClockwise, Copy } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import { EditMessageAction } from "./EditMessage";
import ActionMenu from "./ActionMenu";
import { useTranslation } from "react-i18next";
import { ACT_BTN } from "../../../chatUi";

/**
 * The row of 36px icon actions under a message.
 * Assistant: copy, regenerate (last reply), good response, read aloud
 * (ttsSlot), edit, more (fork, delete). User: copy, edit.
 */
const Actions = ({
  message,
  feedbackScore,
  chatId,
  slug,
  isLastMessage,
  regenerateMessage,
  forkThread,
  isEditing,
  role,
  ttsSlot = null,
}) => {
  const { t } = useTranslation();
  const [selectedFeedback, setSelectedFeedback] = useState(feedbackScore);
  const handleFeedback = async (newFeedback) => {
    const updatedFeedback =
      selectedFeedback === newFeedback ? null : newFeedback;
    await Workspace.updateChatFeedback(chatId, slug, updatedFeedback);
    setSelectedFeedback(updatedFeedback);
  };

  if (role === "user") {
    return (
      <div className="flex items-center gap-0.5">
        <CopyMessage message={message} />
        <EditMessageAction chatId={chatId} role={role} isEditing={isEditing} />
      </div>
    );
  }

  return (
    <div data-row="message-actions" className="flex items-center gap-0.5">
      <CopyMessage message={message} />
      {isLastMessage && !isEditing && (
        <RegenerateMessage
          regenerateMessage={regenerateMessage}
          slug={slug}
          chatId={chatId}
        />
      )}
      {chatId && !isEditing && (
        <FeedbackButton
          isSelected={selectedFeedback === true}
          handleFeedback={() => handleFeedback(true)}
          tooltipContent={t("chat_window.good_response")}
          IconComponent={ThumbsUp}
        />
      )}
      {ttsSlot}
      <EditMessageAction chatId={chatId} role={role} isEditing={isEditing} />
      <ActionMenu
        chatId={chatId}
        forkThread={forkThread}
        isEditing={isEditing}
        role={role}
      />
    </div>
  );
};

function FeedbackButton({
  isSelected,
  handleFeedback,
  tooltipContent,
  IconComponent,
}) {
  return (
    <button
      type="button"
      onClick={handleFeedback}
      data-tooltip-id="feedback-button"
      data-tooltip-content={tooltipContent}
      className={`${ACT_BTN} ${isSelected ? "!text-ml-accent-text" : ""}`}
      aria-label={tooltipContent}
      aria-pressed={isSelected}
    >
      <IconComponent size={18} weight={isSelected ? "fill" : "regular"} />
    </button>
  );
}

function CopyMessage({ message }) {
  const { copied, copyText } = useCopyText();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => copyText(message)}
      data-tooltip-id="copy-assistant-text"
      data-tooltip-content={t("chat_window.copy")}
      className={ACT_BTN}
      aria-label={t("chat_window.copy")}
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
    </button>
  );
}

function RegenerateMessage({ regenerateMessage, chatId }) {
  const { t } = useTranslation();
  if (!chatId) return null;
  return (
    <button
      type="button"
      onClick={() => regenerateMessage(chatId)}
      data-tooltip-id="regenerate-assistant-text"
      data-tooltip-content={t("chat_window.regenerate_response")}
      className={ACT_BTN}
      aria-label={t("chat_window.regenerate")}
    >
      <ArrowClockwise size={18} />
    </button>
  );
}

export default memo(Actions);
