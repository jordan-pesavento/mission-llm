import { useMemo, useCallback, useEffect, forwardRef } from "react";
import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import StatusResponse from "./StatusResponse";
import ToolApprovalRequest from "./ToolApprovalRequest";
import ClarifyingQuestionCard from "./ClarifyingQuestion";
import FileDownloadCard from "./FileDownloadCard";
import ImageGenerationPending from "./ImageGenerationPending";
import ScheduledJobCreatedCard from "./ScheduledJobCreatedCard";
import { useManageWorkspaceModal } from "../../../Modals/ManageWorkspace";
import ManageWorkspace from "../../../Modals/ManageWorkspace";
import { ArrowDown } from "@phosphor-icons/react";
import Chartable from "./Chartable";
import ModelRouteNotification from "./ModelRouteNotification";
import Workspace from "@/models/workspace";
import { useNavigate, useParams } from "react-router-dom";
import paths from "@/utils/paths";
import { THREAD_FORK_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";
import Appearance from "@/models/appearance";
import useTextSize from "@/hooks/useTextSize";
import useAutoScroll from "@/hooks/useAutoScroll";
import {
  ThoughtExpansionProvider,
  THOUGHT_REGEX_OPEN,
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
} from "./ThoughtContainer";
import { MessageActionsProvider } from "./MessageActionsContext";
import { useTranslation } from "react-i18next";
import { dayKey, formatClock, formatDay, toDate } from "../chatUi";

export default forwardRef(function (
  {
    history = [],
    workspace,
    sendCommand,
    updateHistory,
    regenerateAssistantMessage,
    websocket = null,
  },
  ref
) {
  const { chatHistoryRef, isAtBottom, scrollToBottom, scrollHandlers } =
    useAutoScroll(history, ref);
  const navigate = useNavigate();
  const { threadSlug = null } = useParams();
  const { showing, hideModal } = useManageWorkspaceModal();
  const { showScrollbar } = Appearance.getSettings();
  const { textSize } = useTextSize();
  const { t, i18n } = useTranslation();
  const locale = i18n?.language;

  // Opening or closing the Sources drawer (or collapsing the rail) changes the
  // thread's width and re-wraps every message. Keep a reader who was at the
  // latest message there instead of leaving them mid-thread.
  useEffect(() => {
    const el = chatHistoryRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let atBottom = true;
    const onScroll = () => {
      atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    };
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      if (atBottom) el.scrollTop = el.scrollHeight;
    });
    el.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [chatHistoryRef]);

  const saveEditedMessage = useCallback(
    async ({
      editedMessage,
      chatId,
      role,
      attachments = [],
      saveOnly = false,
    }) => {
      if (!editedMessage) return;

      if (role === "user" && saveOnly) {
        const updatedHistory = [...history];
        const targetIdx = history.findIndex((msg) => msg.chatId === chatId);
        if (targetIdx < 0) return;
        updatedHistory[targetIdx].content = editedMessage;
        updateHistory(updatedHistory);
        await Workspace.updateChat(
          workspace.slug,
          threadSlug,
          chatId,
          editedMessage,
          "user"
        );
        return;
      }

      if (role === "user") {
        const updatedHistory = history.slice(
          0,
          history.findIndex((msg) => msg.chatId === chatId) + 1
        );
        updatedHistory[updatedHistory.length - 1].content = editedMessage;
        await Workspace.deleteEditedChats(workspace.slug, threadSlug, chatId);
        sendCommand({
          text: editedMessage,
          autoSubmit: true,
          history: updatedHistory,
          attachments,
        });
        return;
      }

      if (role === "assistant") {
        const updatedHistory = [...history];
        const targetIdx = history.findIndex(
          (msg) => msg.chatId === chatId && msg.role === role
        );
        if (targetIdx < 0) return;
        updatedHistory[targetIdx].content = editedMessage;
        updateHistory(updatedHistory);
        await Workspace.updateChat(
          workspace.slug,
          threadSlug,
          chatId,
          editedMessage
        );
        return;
      }
    },
    [workspace.slug, threadSlug, updateHistory, history, sendCommand]
  );

  const forkThread = useCallback(
    async (chatId) => {
      const newThreadSlug = await Workspace.forkThread(
        workspace.slug,
        threadSlug,
        chatId
      );
      // Surface the fork in the sidebar first - if the navigation below gets
      // blocked (ActiveGenerationGuard) and cancelled, the new thread still
      // exists and stays reachable. Router navigation so the guard can
      // intercept while a response is generating.
      window.dispatchEvent(
        new CustomEvent(THREAD_FORK_EVENT, {
          detail: { threadSlug: newThreadSlug },
        })
      );
      navigate(paths.workspace.thread(workspace.slug, newThreadSlug));
    },
    [workspace.slug, threadSlug, navigate]
  );

  const compiledHistory = useMemo(
    () =>
      buildMessages({
        workspace,
        history,
        regenerateAssistantMessage,
        saveEditedMessage,
        forkThread,
        websocket,
        locale,
      }),
    [
      workspace,
      history,
      regenerateAssistantMessage,
      saveEditedMessage,
      forkThread,
      websocket,
      locale,
    ]
  );
  // A chain stays animated while the run feeding it is still live: an open
  // agent websocket session, or an HTTP reply still streaming (animate flag).
  // Gating on liveness keeps a chain that ends up last (aborted/errored run,
  // stopped agent, reloaded history) from showing a working state forever,
  // while covering the gaps between activities (thought closed, tool still
  // running, next status not yet arrived).
  const isLastMessageAnimating = !!history?.[history.length - 1]?.animate;
  const runIsLive = !!websocket || isLastMessageAnimating;
  const renderStatusResponse = useCallback(
    (item, index) => {
      const hasSubsequentMessages = index < compiledHistory.length - 1;
      return (
        <StatusResponse
          // Keyed by the first node so a chain keeps its own client-side
          // timing state when items above it are removed (regenerate, the
          // content-less message sweeps) and compiled indexes shift.
          key={item[0]?.uuid ?? `status-group-${index}`}
          messages={item}
          isLastGroup={!hasSubsequentMessages}
          isThinking={!hasSubsequentMessages && runIsLive}
        />
      );
    },
    [compiledHistory.length, runIsLive]
  );

  return (
    <MessageActionsProvider>
      <ThoughtExpansionProvider>
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            className={`markdown flex-1 min-h-0 overflow-y-auto text-ml-text ${CHAT_TEXT_SIZES[textSize] ?? CHAT_TEXT_SIZES.normal} px-gutter pt-[26px] pb-3 ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
            id="chat-history"
            ref={chatHistoryRef}
            {...scrollHandlers}
          >
            <div
              data-align="chat:left"
              className="w-full flex flex-col gap-[26px]"
            >
              {compiledHistory.map((item, index) =>
                Array.isArray(item) ? renderStatusResponse(item, index) : item
              )}
            </div>
            {showing && (
              <ManageWorkspace
                hideModal={hideModal}
                providedSlug={workspace.slug}
              />
            )}
          </div>
          {!isAtBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              aria-label={t("chat_window.scroll_to_latest")}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-10 h-10 grid place-items-center rounded-full border border-ml-line-2 bg-ml-raised text-ml-text-2 shadow-ml-pop cursor-pointer transition-colors duration-150 hover:text-ml-text hover:border-ml-accent-line"
            >
              <ArrowDown weight="bold" size={18} />
            </button>
          )}
        </div>
      </ThoughtExpansionProvider>
    </MessageActionsProvider>
  );
});

/**
 * Chat text sizes for the text size setting. The concept's reading size is
 * 17px / 1.68; small and large step by 2px and stay above the 13px floor.
 */
const CHAT_TEXT_SIZES = {
  small: "text-[15px] leading-[1.65]",
  normal: "text-[17px] leading-[1.68]",
  large: "text-[19px] leading-[1.68]",
};

/**
 * "Today · 09:41" rule between days, from the messages' real send times.
 */
function DayDivider({ label }) {
  return (
    <div
      role="separator"
      aria-label={label}
      className="flex items-center gap-3.5 font-mono font-medium text-[13.5px] leading-none text-ml-text-3 before:content-[''] before:flex-1 before:h-px before:bg-ml-line after:content-[''] after:flex-1 after:h-px after:bg-ml-line"
    >
      <span className="whitespace-nowrap">{label}</span>
    </div>
  );
}

/**
 * Builds the history of messages for the chat.
 * This is mostly useful for rendering the history in a way that is easy to understand.
 * as well as compensating for agent thinking and other messages that are not part of the history, but
 * are still part of the chat.
 *
 * @param {Object} param0 - The parameters for building the messages.
 * @param {Array} param0.history - The history of messages.
 * @param {Object} param0.workspace - The workspace object.
 * @param {Function} param0.regenerateAssistantMessage - The function to regenerate the assistant message.
 * @param {Function} param0.saveEditedMessage - The function to save the edited message.
 * @param {Function} param0.forkThread - The function to fork the thread.
 * @param {WebSocket} param0.websocket - The active websocket connection for agent communication.
 * @returns {Array} The compiled history of messages.
 */
function buildMessages({
  history,
  workspace,
  regenerateAssistantMessage,
  saveEditedMessage,
  forkThread,
  websocket,
  locale,
}) {
  let lastDay = null;
  return history.reduce((acc, props, index) => {
    const isLastBotReply =
      index === history.length - 1 && props.role === "assistant";

    // A "Today · 09:41" divider opens each calendar day, taken from the real
    // send time of the first user message of that day.
    if (props.role === "user") {
      const sent = toDate(props.sentAt);
      if (sent && dayKey(sent) !== lastDay) {
        lastDay = dayKey(sent);
        const label = [formatDay(sent, locale), formatClock(sent, locale)]
          .filter(Boolean)
          .join(" · ");
        if (label)
          acc.push(
            <DayDivider key={`day-${lastDay}-${index}`} label={label} />
          );
      }
    }

    if (props?.type === "statusResponse" && !!props.content) {
      pushActivity(acc, props);
      return acc;
    }

    if (props.type === "modelRouteNotification") {
      const lastMsg = history[history.length - 1];
      const isLast =
        index === history.length - 1 ||
        (index === history.length - 2 &&
          (lastMsg?.animate || lastMsg?.pending));
      const isStreaming =
        isLast &&
        (index === history.length - 1 || lastMsg?.animate || lastMsg?.pending);
      acc.push(
        <ModelRouteNotification
          key={`route-${props.uuid}`}
          routedTo={props.routedTo}
          isStreaming={isStreaming}
        />
      );
      return acc;
    }

    if (props.type === "toolApprovalRequest") {
      acc.push(
        <ToolApprovalRequest
          key={`tool-approval-${props.requestId}`}
          requestId={props.requestId}
          skillName={props.skillName}
          payload={props.payload}
          description={props.description}
          timeoutMs={props.timeoutMs}
          websocket={websocket}
        />
      );
      return acc;
    }

    if (props.type === "clarifyingQuestion") {
      acc.push(
        <ClarifyingQuestionCard
          key={`clarify-${props.requestId}`}
          requestId={props.requestId}
          questions={props.questions}
          allowSkip={props.allowSkip}
          timeoutMs={props.timeoutMs}
          websocket={websocket}
        />
      );
      return acc;
    }

    if (props.type === "rechartVisualize" && !!props.content) {
      acc.push(<Chartable key={props.uuid} props={props} />);
    } else if (props.type === "fileDownloadCard" && !!props.content) {
      acc.push(<FileDownloadCard key={props.uuid} props={props} />);
    } else if (props.type === "scheduledJobCreated" && !!props.content) {
      acc.push(<ScheduledJobCreatedCard key={props.uuid} props={props} />);
    } else if (props.type === "imageGenerationPending") {
      acc.push(
        <ImageGenerationPending
          key={`img-pending-${props.uuid || index}`}
          aborted={props.closed}
        />
      );
    } else {
      // Assistant replies can carry a <think> segment. Split it into the
      // activity chain so it rolls up with any surrounding agent statuses;
      // only the visible remainder renders as an actual message, which is
      // what breaks the chain.
      if (props.role === "assistant" && typeof props.content === "string") {
        const { thought, hasVisible } = splitAssistantThought(props);
        if (thought) {
          pushActivity(acc, {
            type: "thoughtChain",
            uuid: props.uuid ? `thought-${props.uuid}` : undefined,
            content: thought,
          });
        }
        if (!hasVisible) return acc;
      }

      if (isLastBotReply && props.animate) {
        acc.push(
          <PromptReply
            key={`prompt-reply-${props.uuid || index}`}
            uuid={props.uuid}
            reply={props.content}
            pending={props.pending}
            sources={props.sources}
            error={props.error}
            closed={props.closed}
          />
        );
      } else {
        acc.push(
          <HistoricalMessage
            key={index}
            uuid={props.uuid}
            message={props.content}
            role={props.role}
            workspace={workspace}
            sources={props.sources}
            feedbackScore={props.feedbackScore}
            chatId={props.chatId}
            error={props.error}
            attachments={props.attachments}
            regenerateMessage={regenerateAssistantMessage}
            isLastMessage={isLastBotReply}
            saveEditedMessage={saveEditedMessage}
            forkThread={forkThread}
            metrics={props.metrics}
            outputs={props.outputs}
            clarifyingQuestions={props.clarifyingQuestions}
            sentAt={props.sentAt}
          />
        );
      }
    }
    return acc;
  }, []);
}

/**
 * Appends an activity node (agent status or thought segment) to the current
 * activity chain, or starts a new chain when the previous compiled item is a
 * visible message/card - visible content is what breaks a chain.
 * @param {Array} acc - the compiled history being built
 * @param {Object} node - statusResponse history item or thoughtChain node
 */
function pushActivity(acc, node) {
  if (acc.length > 0 && Array.isArray(acc[acc.length - 1])) {
    acc[acc.length - 1].push(node);
  } else {
    acc.push([node]);
  }
}

/**
 * Splits an assistant message into its thought segment (if any) and reports
 * whether anything visible remains to render as a message. A message with an
 * open think tag and no close is mid-thought: the whole content is thought.
 * `hasVisible` stays true for messages that carry other renderable payloads
 * (citations, attachments, outputs, errors, the pending placeholder) even
 * when the text itself is empty.
 * @param {Object} props - the history item
 * @returns {{thought: string|null, hasVisible: boolean}}
 */
function splitAssistantThought(props) {
  const content = props.content;
  let thought = null;
  const complete = content.match(THOUGHT_REGEX_COMPLETE);
  if (complete) thought = complete[0];
  else if (
    content.match(THOUGHT_REGEX_OPEN) &&
    !content.match(THOUGHT_REGEX_CLOSE)
  )
    thought = content;

  const visibleText =
    thought === null
      ? content
      : thought === content
        ? ""
        : content.replace(THOUGHT_REGEX_COMPLETE, "");
  const hasVisible =
    visibleText.trim().length > 0 ||
    !!props.pending ||
    !!props.error ||
    (props.sources?.length ?? 0) > 0 ||
    (props.attachments?.length ?? 0) > 0 ||
    (props.outputs?.length ?? 0) > 0 ||
    (props.clarifyingQuestions?.length ?? 0) > 0;
  return { thought, hasVisible };
}
