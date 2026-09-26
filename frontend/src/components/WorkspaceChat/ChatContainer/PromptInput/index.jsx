import { useState, useRef, useEffect } from "react";
import debounce from "lodash.debounce";
import { ArrowUp, At, Wrench } from "@phosphor-icons/react";
import { COMPOSER_CHIP } from "../chatUi";
import StopGenerationButton from "./StopGenerationButton";
import SpeechToText from "./SpeechToText";
import { Tooltip } from "react-tooltip";
import AttachmentManager from "./Attachments";
import AttachItem from "./AttachItem";
import {
  ATTACHMENTS_PROCESSED_EVENT,
  ATTACHMENTS_PROCESSING_EVENT,
  PASTE_ATTACHMENT_EVENT,
} from "../DnDWrapper";
import useTextSize from "@/hooks/useTextSize";
import { useTranslation } from "react-i18next";
import Appearance from "@/models/appearance";
import usePromptInputStorage from "@/hooks/usePromptInputStorage";
import ToolsMenu, { TOOLS_MENU_KEYBOARD_EVENT } from "./ToolsMenu";
import { useSearchParams } from "react-router-dom";
import { useIsAgentSessionActive } from "@/utils/chat/agent";

export const PROMPT_INPUT_ID = "primary-prompt-input";
export const PROMPT_INPUT_EVENT = "set_prompt_input";
const MAX_EDIT_STACK_SIZE = 100;

/**
 * @param {Workspace} props.workspace - workspace object
 * @param {function} props.submit - form submit handler
 * @param {boolean} props.isStreaming - disables input while streaming response
 * @param {function} props.sendCommand - handler for slash commands and agent mentions
 * @param {Array} [props.attachments] - file attachments array
 * @param {boolean} [props.centered] - renders in centered layout mode (for home page)
 * @param {string} [props.workspaceSlug] - workspace slug for home page context
 * @param {string} [props.threadSlug] - thread slug for home page context
 */
export default function PromptInput({
  workspace = {},
  submit,
  isStreaming,
  sendCommand,
  attachments = [],
  centered = false,
  workspaceSlug = null,
  threadSlug = null,
}) {
  const { t } = useTranslation();
  const { showAgentCommand = true } = workspace ?? {};
  const { isDisabled } = useIsDisabled();
  const agentSessionActive = useIsAgentSessionActive();
  const [promptInput, setPromptInput] = useState("");
  const [showTools, setShowTools] = useState(false);
  const autoOpenedToolsRef = useRef(false);
  const toolsHighlightRef = useRef(-1);
  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const [_, setFocused] = useState(false);
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const { textSize } = useTextSize();
  const [searchParams] = useSearchParams();

  // Synchronizes prompt input value with localStorage, scoped to the current thread.
  usePromptInputStorage({
    promptInput,
    setPromptInput,
    workspaceSlug: workspaceSlug ?? workspace?.slug,
    threadSlug,
  });

  /*
   * @checklist-item
   * If the URL has the agent param, open the agent menu for the user
   * automatically when the component mounts.
   */
  useEffect(() => {
    if (searchParams.get("action") === "set-agent-chat") {
      sendCommand({ text: "@agent " });
      textareaRef.current?.focus();
    }
  }, [textareaRef.current]);

  /**
   * To prevent too many re-renders we remotely listen for updates from the parent
   * via an event cycle. Otherwise, using message as a prop leads to a re-render every
   * change on the input.
   * @param {{detail: {messageContent: string, writeMode: 'replace' | 'append'}}} e
   */
  function handlePromptUpdate(e) {
    const { messageContent, writeMode = "replace" } = e?.detail ?? {};
    if (writeMode === "append") setPromptInput((prev) => prev + messageContent);
    else if (writeMode === "prepend")
      setPromptInput((prev) => messageContent + " " + prev);
    else setPromptInput(messageContent ?? "");
  }

  useEffect(() => {
    if (!!window)
      window.addEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
    return () =>
      window?.removeEventListener(PROMPT_INPUT_EVENT, handlePromptUpdate);
  }, []);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) textareaRef.current.focus();
    resetTextAreaHeight();
  }, [isStreaming]);

  /**
   * Save the current state before changes
   * @param {number} adjustment
   */
  function saveCurrentState(adjustment = 0) {
    // The debounced call can land after this instance unmounted (eg: the
    // empty->chat transition remounts PromptInput mid-debounce).
    if (!textareaRef.current) return;
    if (undoStack.current.length >= MAX_EDIT_STACK_SIZE)
      undoStack.current.shift();
    undoStack.current.push({
      value: promptInput,
      cursorPositionStart: textareaRef.current.selectionStart + adjustment,
      cursorPositionEnd: textareaRef.current.selectionEnd + adjustment,
    });
  }
  const debouncedSaveState = debounce(saveCurrentState, 250);

  function handleSubmit(e) {
    // Ignore submits from portaled modals (slash command preset forms)
    if (e.target !== e.currentTarget) return;
    setFocused(false);
    setShowTools(false);
    submit(e);
  }

  function resetTextAreaHeight() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
  }

  /**
   * Capture enter key press to handle submission, redo, or undo
   * via keyboard shortcuts
   * @param {KeyboardEvent} event
   */
  function captureEnterOrUndo(event) {
    // Forward keyboard events to the ToolsMenu when open
    if (showTools) {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent(TOOLS_MENU_KEYBOARD_EVENT, {
            detail: { key: event.key },
          })
        );
        return;
      }
      // When an item is highlighted via arrow keys, Enter selects it.
      // Otherwise, Enter falls through to submit the form normally.
      if (event.key === "Enter" && toolsHighlightRef.current >= 0) {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent(TOOLS_MENU_KEYBOARD_EVENT, {
            detail: { key: "Enter" },
          })
        );
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setShowTools(false);
        textareaRef.current?.focus();
        return;
      }
    }

    // "/" toggles the Tools menu only when the input is empty
    if (
      event.key === "/" &&
      !event.ctrlKey &&
      !event.metaKey &&
      promptInput.trim() === ""
    ) {
      setShowTools((prev) => {
        autoOpenedToolsRef.current = !prev;
        return !prev;
      });
      return;
    }

    // Is simple enter key press w/o shift key
    if (event.keyCode === 13 && !event.shiftKey) {
      event.preventDefault();
      if (isStreaming || isDisabled) return; // Prevent submission if streaming or disabled
      setShowTools(false);
      return submit(event);
    }

    // Is undo with Ctrl+Z or Cmd+Z + Shift key = Redo
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      event.shiftKey
    ) {
      event.preventDefault();
      if (redoStack.current.length === 0) return;

      const nextState = redoStack.current.pop();
      if (!nextState) return;

      undoStack.current.push({
        value: promptInput,
        cursorPositionStart: textareaRef.current.selectionStart,
        cursorPositionEnd: textareaRef.current.selectionEnd,
      });
      setPromptInput(nextState.value);
      setTimeout(() => {
        textareaRef.current.setSelectionRange(
          nextState.cursorPositionStart,
          nextState.cursorPositionEnd
        );
      }, 0);
    }

    // Undo with Ctrl+Z or Cmd+Z
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key === "z" &&
      !event.shiftKey
    ) {
      if (undoStack.current.length === 0) return;
      const lastState = undoStack.current.pop();
      if (!lastState) return;

      redoStack.current.push({
        value: promptInput,
        cursorPositionStart: textareaRef.current.selectionStart,
        cursorPositionEnd: textareaRef.current.selectionEnd,
      });
      setPromptInput(lastState.value);
      setTimeout(() => {
        textareaRef.current.setSelectionRange(
          lastState.cursorPositionStart,
          lastState.cursorPositionEnd
        );
      }, 0);
    }
  }

  function adjustTextArea(event) {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }

  function handlePasteEvent(e) {
    e.preventDefault();
    if (e.clipboardData.items.length === 0) return false;

    // paste any clipboard items that are images.
    for (const item of e.clipboardData.items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        window.dispatchEvent(
          new CustomEvent(PASTE_ATTACHMENT_EVENT, {
            detail: { files: [file] },
          })
        );
        continue;
      }

      // handle files specifically that are not images as uploads
      if (item.kind === "file") {
        const file = item.getAsFile();
        window.dispatchEvent(
          new CustomEvent(PASTE_ATTACHMENT_EVENT, {
            detail: { files: [file] },
          })
        );
        continue;
      }
    }

    const pasteText = e.clipboardData.getData("text/plain");
    if (pasteText) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newPromptInput =
        promptInput.substring(0, start) +
        pasteText +
        promptInput.substring(end);
      setPromptInput(newPromptInput);

      // Set the cursor position after the pasted text
      // we need to use setTimeout to prevent the cursor from being set to the end of the text
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + pasteText.length;
        adjustTextArea({ target: textarea });
      }, 0);
    }
    return;
  }

  function handleChange(e) {
    debouncedSaveState(-1);
    adjustTextArea(e);
    const value = e.target.value;
    setPromptInput(value);

    // Auto-dismiss the tools menu when the "/" that opened it is modified
    if (autoOpenedToolsRef.current && showTools && value !== "/") {
      setShowTools(false);
      autoOpenedToolsRef.current = false;
    }
  }

  const placeholder = workspace?.name
    ? t("chat_window.ask_workspace", { workspace: workspace.name })
    : t("chat_window.send_message");

  return (
    <div
      id="prompt-input-wrapper"
      className="w-full shrink-0 relative z-10 px-gutter pt-2 pb-4 pwa:pb-5"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative w-full">
          <ToolsMenu
            workspace={workspace}
            showing={showTools}
            setShowing={setShowTools}
            sendCommand={sendCommand}
            promptRef={textareaRef}
            centered={centered}
            highlightedIndexRef={toolsHighlightRef}
          />
          <div
            data-align="chat:left"
            className="w-full flex flex-col rounded-[18px] border border-ml-line-2 [background:linear-gradient(180deg,var(--ml-raised),var(--ml-panel))] shadow-ml transition-[border-color,box-shadow] duration-150 focus-within:border-ml-accent-line focus-within:shadow-[var(--ml-shadow),0_0_0_4px_var(--ml-accent-soft)]"
          >
            <AttachmentManager attachments={attachments} />
            <textarea
              id={PROMPT_INPUT_ID}
              ref={textareaRef}
              rows={1}
              onChange={handleChange}
              onKeyDown={captureEnterOrUndo}
              onPaste={(e) => {
                saveCurrentState();
                handlePasteEvent(e);
              }}
              required={true}
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                setFocused(false);
                adjustTextArea(e);
              }}
              value={promptInput}
              spellCheck={Appearance.get("enableSpellCheck")}
              aria-label={placeholder}
              className={`block w-full border-0 bg-transparent cursor-text resize-none min-h-[58px] max-h-[50vh] md:max-h-[350px] px-[18px] pt-4 pb-1 font-sans text-ml-text leading-[1.5] placeholder:text-ml-text-3 outline-none focus:outline-none focus:ring-0 pwa:!text-[16px] ${COMPOSER_TEXT_SIZES[textSize] ?? COMPOSER_TEXT_SIZES.normal}`}
              placeholder={placeholder}
            />
            <div
              data-row="composer"
              className="flex items-center gap-2 pt-2 pr-2.5 pb-2.5 pl-3"
            >
              <AttachItem
                workspaceSlug={workspaceSlug}
                workspaceThreadSlug={threadSlug}
              />
              <AgentSessionButton
                sendCommand={sendCommand}
                promptInput={promptInput}
                textareaRef={textareaRef}
                visible={!agentSessionActive & showAgentCommand}
              />
              <ToolsButton
                showTools={showTools}
                setShowTools={setShowTools}
                textareaRef={textareaRef}
                autoOpenedToolsRef={autoOpenedToolsRef}
              />
              <span className="flex-1" data-row-skip />
              <SpeechToText sendCommand={sendCommand} />
              {isStreaming ? (
                <StopGenerationButton />
              ) : (
                <SendPromptButton
                  formRef={formRef}
                  promptInput={promptInput}
                  isDisabled={isDisabled}
                />
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// Composer text follows the chat text size setting (17px by default).
const COMPOSER_TEXT_SIZES = {
  small: "text-[15px]",
  normal: "text-[17px]",
  large: "text-[19px]",
};

function AgentSessionButton({
  sendCommand,
  promptInput,
  textareaRef,
  visible = true,
}) {
  const { t } = useTranslation();
  if (!visible) return null;

  function handleClick() {
    try {
      if (promptInput?.trim()?.startsWith("@agent")) return;
      sendCommand({ text: "@agent", writeMode: "prepend" });
    } finally {
      textareaRef?.current?.focus();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-tooltip-id="agent-session"
        data-tooltip-content={t("chat_window.start_agent_session")}
        aria-label={t("chat_window.start_agent_session")}
        className={COMPOSER_CHIP}
      >
        <At size={18} className="pointer-events-none shrink-0" />
        <span className="max-[820px]:sr-only">{t("chat_window.agent")}</span>
      </button>
      <Tooltip
        id="agent-session"
        place="top"
        delayShow={300}
        className="tooltip z-99"
      />
    </>
  );
}

function ToolsButton({
  showTools,
  setShowTools,
  textareaRef,
  autoOpenedToolsRef,
}) {
  const { t } = useTranslation();

  return (
    <button
      id="tools-btn"
      type="button"
      aria-haspopup="menu"
      aria-expanded={showTools}
      onClick={() => {
        autoOpenedToolsRef.current = false;
        setShowTools(!showTools);
        textareaRef.current?.focus();
      }}
      className={`${COMPOSER_CHIP} ${
        showTools ? "!bg-ml-raised-2 !text-ml-text border-ml-line-2" : ""
      }`}
    >
      <Wrench size={18} className="pointer-events-none shrink-0" />
      <span className="max-[820px]:sr-only">{t("chat_window.tools")}</span>
    </button>
  );
}

function SendPromptButton({ formRef, promptInput, isDisabled }) {
  const { t } = useTranslation();
  const canSend = promptInput.trim().length > 0 && !isDisabled;

  return (
    <>
      <button
        ref={formRef}
        type="submit"
        disabled={!canSend}
        className={`w-ctl-lg h-ctl-lg shrink-0 grid place-items-center rounded-[11px] border-0 bg-ml-accent-fill text-ml-on-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_18px_-8px_var(--ml-accent)] transition-[filter,opacity] duration-150 ${
          canSend ? "cursor-pointer hover:brightness-110" : "cursor-default"
        } ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}`}
        data-tooltip-id="send-prompt"
        data-tooltip-content={
          isDisabled
            ? t("chat_window.attachments_processing")
            : t("chat_window.send")
        }
        aria-label={t("chat_window.send")}
      >
        <ArrowUp size={19} className="pointer-events-none" weight="bold" />
      </button>
      <Tooltip
        id="send-prompt"
        place="top"
        delayShow={300}
        className="tooltip z-99"
      />
    </>
  );
}

/**
 * Handle event listeners to prevent the send button from being used
 * for whatever reason that may we may want to prevent the user from sending a message.
 */
function useIsDisabled() {
  const [isDisabled, setIsDisabled] = useState(false);

  /**
   * Handle attachments processing and processed events
   * to prevent the send button from being clicked when attachments are processing
   * or else the query may not have relevant context since RAG is not yet ready.
   */
  useEffect(() => {
    if (!window) return;
    const onProcessing = () => setIsDisabled(true);
    const onProcessed = () => setIsDisabled(false);

    window.addEventListener(ATTACHMENTS_PROCESSING_EVENT, onProcessing);
    window.addEventListener(ATTACHMENTS_PROCESSED_EVENT, onProcessed);

    return () => {
      window.removeEventListener(ATTACHMENTS_PROCESSING_EVENT, onProcessing);
      window.removeEventListener(ATTACHMENTS_PROCESSED_EVENT, onProcessed);
    };
  }, []);

  return { isDisabled };
}
