import { Info, Pencil } from "@phosphor-icons/react";
import { useRef, useEffect } from "react";
import Appearance from "@/models/appearance";
import { useTranslation } from "react-i18next";
import {
  useMessageActionsContext,
  EDIT_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/ChatHistory/MessageActionsContext";
import { ACT_BTN } from "@/components/WorkspaceChat/ChatContainer/chatUi";

export function useEditMessage({ chatId, role }) {
  const context = useMessageActionsContext();
  const isEditing = context?.isEditing(chatId, role) ?? false;
  return { isEditing };
}

export function EditMessageAction({ chatId = null, role, isEditing }) {
  const { t } = useTranslation();
  function handleEditClick() {
    window.dispatchEvent(
      new CustomEvent(EDIT_EVENT, { detail: { chatId, role } })
    );
  }

  if (!chatId || isEditing) return null;
  return (
    <button
      type="button"
      onClick={handleEditClick}
      data-tooltip-id="edit-input-text"
      data-tooltip-content={`${
        role === "user"
          ? t("chat_window.edit_prompt")
          : t("chat_window.edit_response")
      } `}
      className={ACT_BTN}
      aria-label={`Edit ${role === "user" ? t("chat_window.edit_prompt") : t("chat_window.edit_response")}`}
    >
      <Pencil size={18} />
    </button>
  );
}

export function EditMessageForm({
  role,
  chatId,
  message,
  attachments = [],
  adjustTextArea,
  saveChanges,
}) {
  const formRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    const editedMessage = formRef.current.value;
    saveChanges({ editedMessage, chatId, role, attachments });
    window.dispatchEvent(
      new CustomEvent(EDIT_EVENT, { detail: { chatId, role, attachments } })
    );
  }

  function handleSave() {
    const editedMessage = formRef.current.value;
    saveChanges({
      editedMessage,
      chatId,
      role,
      attachments,
      saveOnly: true,
    });
    window.dispatchEvent(
      new CustomEvent(EDIT_EVENT, { detail: { chatId, role, attachments } })
    );
  }

  function cancelEdits() {
    window.dispatchEvent(
      new CustomEvent(EDIT_EVENT, { detail: { chatId, role, attachments } })
    );
    return false;
  }

  useEffect(() => {
    if (!formRef?.current) return;
    formRef.current.focus();
    adjustTextArea({ target: formRef.current });
  }, []);

  const textareaClass =
    "w-full rounded-[18px] bg-ml-panel border border-ml-accent-line shadow-[0_0_0_4px_var(--ml-accent-soft)] text-ml-text text-[1em] leading-[1.6] px-[18px] py-[14px] resize-none overflow-hidden outline-none focus:outline-none focus:ring-0 focus-visible:outline-none";

  if (role === "user") {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col w-full max-w-[min(680px,100%)]"
      >
        <textarea
          ref={formRef}
          name="editedMessage"
          spellCheck={Appearance.get("enableSpellCheck")}
          className={textareaClass}
          defaultValue={message}
          onChange={adjustTextArea}
        />
        <EditActionBar
          onCancel={cancelEdits}
          onSave={handleSave}
          isUserMessage
        />
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col w-full">
      <textarea
        ref={formRef}
        name="editedMessage"
        spellCheck={Appearance.get("enableSpellCheck")}
        className={textareaClass}
        defaultValue={message}
        onChange={adjustTextArea}
      />
      <EditActionBar onCancel={cancelEdits} />
    </form>
  );
}

function EditActionBar({ onCancel, onSave, isUserMessage = false }) {
  const { t } = useTranslation();
  const btn =
    "h-10 px-4 rounded-[11px] text-[14.5px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150";
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <Info size={16} className="shrink-0 mt-0.5 text-ml-text-3" />
        <span className="text-ml-text-3 text-[13.5px] leading-snug">
          {isUserMessage
            ? t("chat_window.edit_info_user")
            : t("chat_window.edit_info_assistant")}
        </span>
      </div>
      <div data-row="edit-actions" className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className={`${btn} border border-transparent text-ml-text-2 hover:bg-ml-raised hover:text-ml-text`}
        >
          {t("chat_window.cancel")}
        </button>
        {isUserMessage && (
          <button
            type="button"
            onClick={onSave}
            className={`${btn} border border-ml-line-2 bg-ml-raised text-ml-text hover:border-ml-accent-line`}
          >
            {t("chat_window.save")}
          </button>
        )}
        <button
          type="submit"
          className={`${btn} border border-transparent bg-ml-accent-fill text-ml-on-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] hover:brightness-105`}
        >
          {isUserMessage ? t("chat_window.submit") : t("chat_window.save")}
        </button>
      </div>
    </div>
  );
}
