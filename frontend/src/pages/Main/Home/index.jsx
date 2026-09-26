import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { isMobile } from "react-device-detect";
import { SidebarMobileHeader } from "@/components/Sidebar";
import PromptInput, {
  PROMPT_INPUT_EVENT,
  PROMPT_INPUT_ID,
} from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import DnDFileUploaderWrapper, {
  DndUploaderContext,
  DnDFileUploaderProvider,
  PASTE_ATTACHMENT_EVENT,
} from "@/components/WorkspaceChat/ChatContainer/DnDWrapper";
import { useTranslation } from "react-i18next";
import {
  LAST_VISITED_WORKSPACE,
  PENDING_HOME_MESSAGE,
} from "@/utils/constants";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import { safeJsonParse } from "@/utils/request";
import useUser from "@/hooks/useUser";
import ChatTopBar from "@/components/WorkspaceChat/ChatContainer/ChatTopBar";
import EmptyChatState from "@/components/WorkspaceChat/ChatContainer/EmptyChatState";
import { ChatTooltips } from "@/components/WorkspaceChat/ChatContainer/ChatTooltips";
import { ChatSidebarProvider } from "@/components/WorkspaceChat/ChatContainer/ChatSidebar";
import { clearPromptInputDraft } from "@/hooks/usePromptInputStorage";
import MemoriesSidebar from "@/components/WorkspaceChat/ChatContainer/MemoriesSidebar";

async function getTargetWorkspace() {
  const lastVisited = safeJsonParse(
    localStorage.getItem(LAST_VISITED_WORKSPACE)
  );
  if (lastVisited?.slug) {
    const workspace = await Workspace.bySlug(lastVisited.slug);
    if (workspace) return workspace;
  }

  const workspaces = await Workspace.all();
  return workspaces.length > 0 ? workspaces[0] : null;
}

async function createDefaultWorkspace(workspaceName = "My Workspace") {
  const { workspace, message: errorMsg } = await Workspace.new({
    name: workspaceName,
  });
  if (!workspace) {
    showToast(errorMsg || "Failed to create workspace", "error");
    return null;
  }
  return workspace;
}

export default function Home() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState(null);
  const [threadSlug, setThreadSlug] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const pendingFilesRef = useRef([]);

  useEffect(() => {
    async function init() {
      const ws = await getTargetWorkspace();
      if (ws) {
        const [suggestedMessages, { showAgentCommand }] = await Promise.all([
          Workspace.getSuggestedMessages(ws.slug),
          Workspace.agentCommandAvailable(ws.slug),
        ]);
        setWorkspace({
          ...ws,
          suggestedMessages,
          showAgentCommand,
        });
      }
      setWorkspaceLoading(false);
    }
    init();
  }, []);

  // When workspace/thread becomes available and we have pending files, trigger upload
  useEffect(() => {
    if (workspace && threadSlug && pendingFilesRef.current.length > 0) {
      const files = pendingFilesRef.current;
      pendingFilesRef.current = [];
      window.dispatchEvent(
        new CustomEvent(PASTE_ATTACHMENT_EVENT, { detail: { files } })
      );
    }
  }, [workspace, threadSlug]);

  // Handle paste events when no thread exists yet
  useEffect(() => {
    if (threadSlug) return;

    async function handlePaste(e) {
      const files = e.detail?.files;
      if (!files?.length) return;

      pendingFilesRef.current = files;
      let ws = workspace;
      if (!ws) {
        ws = await createDefaultWorkspace(t("new-workspace.placeholder"));
        if (!ws) return;
        setWorkspace(ws);
      }
      const { thread } = await Workspace.threads.new(ws.slug);
      if (thread) setThreadSlug(thread.slug);
    }

    window.addEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
    return () =>
      window.removeEventListener(PASTE_ATTACHMENT_EVENT, handlePaste);
  }, [workspace, threadSlug]);

  async function handleDropWithoutWorkspace(acceptedFiles) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    const ws = await createDefaultWorkspace(t("new-workspace.placeholder"));
    if (!ws) return;
    setWorkspace(ws);
    const { thread } = await Workspace.threads.new(ws.slug);
    if (thread) setThreadSlug(thread.slug);
  }

  async function handleDropWithWorkspace(acceptedFiles) {
    setDragging(false);
    pendingFilesRef.current = acceptedFiles;
    const { thread } = await Workspace.threads.new(workspace.slug);
    if (thread) setThreadSlug(thread.slug);
  }

  if (workspaceLoading) {
    return (
      <div
        data-frame="main"
        className="relative bg-theme-bg-primary w-full h-full overflow-hidden"
      />
    );
  }

  if (!workspace && user?.role === "default") {
    return <NoWorkspacesAssigned />;
  }

  if (workspace && threadSlug) {
    return (
      <DnDFileUploaderProvider workspace={workspace} threadSlug={threadSlug}>
        <HomeContent
          workspace={workspace}
          setWorkspace={setWorkspace}
          threadSlug={threadSlug}
          setThreadSlug={setThreadSlug}
        />
      </DnDFileUploaderProvider>
    );
  }

  return (
    <DndUploaderContext.Provider
      value={{
        files: [],
        ready: true,
        dragging,
        setDragging,
        onDrop: workspace
          ? handleDropWithWorkspace
          : handleDropWithoutWorkspace,
        parseAttachments: () => [],
      }}
    >
      <HomeContent
        workspace={workspace}
        setWorkspace={setWorkspace}
        threadSlug={null}
        setThreadSlug={setThreadSlug}
      />
    </DndUploaderContext.Provider>
  );
}

function HomeContent({ workspace, setWorkspace, threadSlug, setThreadSlug }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { files, parseAttachments } = useContext(DndUploaderContext);

  useEffect(() => {
    if (!threadSlug) {
      window.dispatchEvent(
        new CustomEvent(PROMPT_INPUT_EVENT, {
          detail: { messageContent: "", writeMode: "replace" },
        })
      );
    }
  }, []);

  async function submitMessage(message, attachments = []) {
    if (!message || loading) return;
    setLoading(true);
    try {
      let targetWorkspace = workspace;
      let targetThread = threadSlug;

      if (!targetWorkspace) {
        targetWorkspace = await createDefaultWorkspace(
          t("new-workspace.placeholder")
        );
        if (!targetWorkspace) {
          setLoading(false);
          return;
        }
        setWorkspace(targetWorkspace);
      }

      if (!targetThread) {
        const { thread } = await Workspace.threads.new(targetWorkspace.slug);
        targetThread = thread?.slug;
        if (thread) setThreadSlug(thread.slug);
      }

      sessionStorage.setItem(
        PENDING_HOME_MESSAGE,
        JSON.stringify({ message, attachments })
      );

      // The message is replayed via PENDING_HOME_MESSAGE on the thread route -
      // drop the local draft so the sent text cannot be restored later.
      if (threadSlug || workspace?.slug)
        clearPromptInputDraft(threadSlug ?? workspace.slug);

      if (targetThread) {
        navigate(paths.workspace.thread(targetWorkspace.slug, targetThread));
      } else {
        navigate(paths.workspace.chat(targetWorkspace.slug));
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      showToast("Failed to send message", "error");
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const currentMessage =
      document.getElementById(PROMPT_INPUT_ID)?.value?.trim() || "";
    await submitMessage(currentMessage, parseAttachments());
  }

  function sendCommand({
    text = "",
    autoSubmit = false,
    writeMode = "replace",
  }) {
    if (autoSubmit) {
      if (writeMode === "append") {
        const currentText =
          document.getElementById(PROMPT_INPUT_ID)?.value ?? "";
        text = currentText + text;
      }
      if (!text.trim()) return;
      submitMessage(text.trim());
      return;
    }
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent: text, writeMode },
      })
    );
  }

  async function handleEditWorkspace() {
    let targetWorkspace = workspace;

    if (!targetWorkspace) {
      targetWorkspace = await createDefaultWorkspace(
        t("new-workspace.placeholder")
      );
      if (!targetWorkspace) return;
      setWorkspace(targetWorkspace);
    }

    navigate(paths.workspace.settings.generalAppearance(targetWorkspace.slug));
  }

  return (
    <ChatSidebarProvider>
      <div
        data-frame="main"
        className="relative flex w-full h-full min-w-0 z-[2]"
      >
        <div className="flex-1 min-w-0 relative flex flex-col bg-theme-bg-primary text-theme-text-primary w-full h-full overflow-hidden">
          {isMobile && <SidebarMobileHeader />}
          <ChatTopBar workspace={workspace} threadSlug={null} />
          <DnDFileUploaderWrapper>
            <EmptyChatState
              workspace={workspace}
              hasAvailableWorkspace={!!workspace}
              sendCommand={sendCommand}
              onCreateAgent={() => navigate(paths.settings.agentSkills())}
              onEditWorkspace={handleEditWorkspace}
              onUploadDocument={() =>
                document.getElementById("dnd-chat-file-uploader")?.click()
              }
            />
            <PromptInput
              workspace={workspace}
              submit={handleSubmit}
              isStreaming={loading}
              sendCommand={sendCommand}
              attachments={files}
              workspaceSlug={workspace?.slug}
              threadSlug={threadSlug}
            />
          </DnDFileUploaderWrapper>
          <ChatTooltips />
        </div>
        <MemoriesSidebar workspace={workspace} />
      </div>
    </ChatSidebarProvider>
  );
}

function NoWorkspacesAssigned() {
  const { t } = useTranslation();
  return (
    <div
      data-frame="main"
      className="relative bg-theme-bg-primary w-full h-full overflow-hidden"
    >
      <div className="flex flex-col h-full w-full items-center justify-center px-gutter">
        <p className="max-w-[560px] text-ml-text-2 text-[16px] leading-relaxed text-center whitespace-pre-line">
          {t("home.notAssigned")}
        </p>
      </div>
    </div>
  );
}
