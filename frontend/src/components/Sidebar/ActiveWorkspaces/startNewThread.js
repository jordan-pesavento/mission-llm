import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import { PROMPT_INPUT_ID } from "@/components/WorkspaceChat/ChatContainer/PromptInput";
import { NEW_THREAD_EVENT } from "./ThreadContainer/events";

/**
 * Opens a fresh conversation in a workspace, from the rail's top button or
 * the "New thread" row under the workspace.
 *
 * When the workspace's default thread has no chats, its bare route already
 * is a fresh conversation: the first message there creates a named thread
 * (ChatContainer handleSubmit), so no empty "Thread" rows pile up. When the
 * default thread has chats, a new thread is created and opened instead.
 *
 * @param {string} workspaceSlug
 * @param {import("react-router-dom").NavigateFunction} navigate
 * @returns {Promise<{error: string|null}>}
 */
export default async function startNewThread(workspaceSlug, navigate) {
  const { defaultThreadChatCount = 0 } =
    await Workspace.threads.all(workspaceSlug);

  if (!defaultThreadChatCount) {
    navigate(paths.workspace.chat(workspaceSlug));
    focusPromptInput();
    return { error: null };
  }

  const { thread, error } = await Workspace.threads.new(workspaceSlug);
  if (error || !thread) return { error: error || "unknown error" };

  // Show the new thread in the rail right away, even if the navigation below
  // gets blocked (ActiveGenerationGuard) and cancelled.
  window.dispatchEvent(
    new CustomEvent(NEW_THREAD_EVENT, {
      detail: { workspaceSlug, thread },
    })
  );
  navigate(paths.workspace.thread(workspaceSlug, thread.slug));
  focusPromptInput();
  return { error: null };
}

function focusPromptInput() {
  // After the route change renders the composer.
  setTimeout(() => document.getElementById(PROMPT_INPUT_ID)?.focus(), 150);
}
