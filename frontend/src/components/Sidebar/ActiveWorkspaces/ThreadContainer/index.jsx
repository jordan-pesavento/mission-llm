import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import { Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import ThreadItem from "./ThreadItem";
import { useNavigate, useParams } from "react-router-dom";
import useHoverMetaKey from "./hooks";
import {
  THREAD_RENAME_EVENT,
  THREAD_FORK_EVENT,
  NEW_THREAD_EVENT,
} from "./events";
export { THREAD_RENAME_EVENT, THREAD_FORK_EVENT, NEW_THREAD_EVENT };

export default function ThreadContainer({
  workspace,
  isVirtualThread = false,
}) {
  const navigate = useNavigate();
  const { threadSlug = null } = useParams();
  const [threads, setThreads] = useState([]);
  const [defaultThreadHasChats, setDefaultThreadHasChats] = useState(false);
  const [loading, setLoading] = useState(true);
  const { containerRef, ctrlPressed } = useHoverMetaKey(setThreads, !loading);

  useEffect(() => {
    const chatHandler = (event) => {
      const { threadSlug, newName } = event.detail;
      setThreads((prevThreads) =>
        prevThreads.map((thread) => {
          if (thread.slug === threadSlug) {
            return { ...thread, name: newName };
          }
          return thread;
        })
      );
    };

    window.addEventListener(THREAD_RENAME_EVENT, chatHandler);

    return () => {
      window.removeEventListener(THREAD_RENAME_EVENT, chatHandler);
    };
  }, []);

  // Handle new fork events from chat actions. Forking navigates via the router
  // now, so a blocked/cancelled navigation would otherwise leave the new thread
  // missing from this list until the next refetch.
  useEffect(() => {
    const forkHandler = () => {
      if (!workspace?.slug) return;
      Workspace.threads
        .all(workspace.slug)
        .then(({ threads }) => setThreads(threads))
        .catch((e) => console.error(e));
    };

    window.addEventListener(THREAD_FORK_EVENT, forkHandler);
    return () => {
      window.removeEventListener(THREAD_FORK_EVENT, forkHandler);
    };
  }, [workspace?.slug]);

  // The "New thread" button lives at the top of the rail now; show its
  // thread here right away, even if the navigation to it gets cancelled.
  useEffect(() => {
    const newThreadHandler = (event) => {
      const { workspaceSlug, thread } = event?.detail || {};
      if (!thread?.slug || workspaceSlug !== workspace?.slug) return;
      setThreads((prev) =>
        prev.some((t) => t.slug === thread.slug) ? prev : [...prev, thread]
      );
    };
    window.addEventListener(NEW_THREAD_EVENT, newThreadHandler);
    return () => window.removeEventListener(NEW_THREAD_EVENT, newThreadHandler);
  }, [workspace?.slug]);

  useEffect(() => {
    async function fetchThreads() {
      if (!workspace.slug) return;
      const { threads, defaultThreadChatCount } = await Workspace.threads.all(
        workspace.slug
      );
      setLoading(false);
      setThreads(threads);
      setDefaultThreadHasChats(defaultThreadChatCount > 0);
    }
    fetchThreads();
  }, [workspace.slug, threadSlug]);

  const toggleForDeletion = (id) => {
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, deleted: !t.deleted };
      })
    );
  };

  const handleDeleteAll = async () => {
    const slugs = threads.filter((t) => t.deleted === true).map((t) => t.slug);
    await Workspace.threads.deleteBulk(workspace.slug, slugs);
    setThreads((prev) => prev.filter((t) => !t.deleted));

    // Only redirect if current thread is being deleted. Use router navigation
    // so ActiveGenerationGuard can intercept if a response is generating.
    if (slugs.includes(threadSlug)) {
      navigate(paths.workspace.chat(workspace.slug));
    }
  };

  function removeThread(threadId) {
    setThreads((prev) =>
      prev.map((_t) => {
        if (_t.id !== threadId) return _t;
        return { ..._t, deleted: true };
      })
    );

    // Show thread was deleted, but then remove from threads entirely so it will
    // not appear in bulk-selection.
    setTimeout(() => {
      setThreads((prev) => prev.filter((t) => !t.deleted));
    }, 500);
  }

  function getActiveThreadIdx() {
    if (isVirtualThread)
      return threads.length + (defaultThreadHasChats ? 1 : 0);
    // On a bare workspace route with no default chats, show virtual thread as active
    if (!threadSlug && !defaultThreadHasChats)
      return threads.length + (defaultThreadHasChats ? 1 : 0);
    const idx = threads.findIndex((t) => t?.slug === threadSlug);
    if (idx >= 0) return idx + (defaultThreadHasChats ? 1 : 0);
    if (!threadSlug && defaultThreadHasChats) return 0;
    return -1;
  }

  // Thread tree: a guide line on the left, rows indented under the workspace.
  const treeClass =
    "flex flex-col gap-y-[2px] shrink-0 mt-2 mb-2 ml-[24px] pl-[12px] border-l border-ml-line-2";

  if (loading) {
    return (
      <div className={treeClass} aria-busy="true" aria-label="Threads">
        <div className="h-[38px] rounded-[9px] bg-ml-raised animate-pulse" />
      </div>
    );
  }

  const activeThreadIdx = getActiveThreadIdx();

  // Show a virtual thread when on a bare workspace route (no threadSlug) and
  // the default thread has no chats — mimics the Home page virtual thread behavior.
  const showVirtualThread =
    isVirtualThread || (!threadSlug && !defaultThreadHasChats);

  return (
    <div
      ref={containerRef}
      className={treeClass}
      role="list"
      aria-label="Threads"
    >
      {defaultThreadHasChats && (
        <ThreadItem
          idx={0}
          activeIdx={activeThreadIdx}
          isActive={activeThreadIdx === 0}
          workspace={workspace}
          thread={{ slug: null, name: "default" }}
          hasNext={threads.length > 0 || showVirtualThread}
        />
      )}
      {threads.map((thread, i) => (
        <ThreadItem
          key={thread.slug}
          idx={i + (defaultThreadHasChats ? 1 : 0)}
          ctrlPressed={ctrlPressed}
          toggleMarkForDeletion={toggleForDeletion}
          activeIdx={activeThreadIdx}
          isActive={activeThreadIdx === i + (defaultThreadHasChats ? 1 : 0)}
          workspace={workspace}
          onRemove={removeThread}
          thread={thread}
          hasNext={i !== threads.length - 1 || showVirtualThread}
        />
      ))}
      {showVirtualThread && (
        <ThreadItem
          idx={activeThreadIdx}
          activeIdx={activeThreadIdx}
          isActive={true}
          workspace={workspace}
          thread={{ slug: null, name: "*New Thread", virtual: true }}
          hasNext={false}
        />
      )}
      <DeleteAllThreadButton
        ctrlPressed={ctrlPressed}
        threads={threads}
        onDelete={handleDeleteAll}
      />
    </div>
  );
}

function DeleteAllThreadButton({ ctrlPressed, threads, onDelete }) {
  if (!ctrlPressed || threads.filter((t) => t.deleted).length === 0)
    return null;
  return (
    <button
      type="button"
      onClick={onDelete}
      className="w-full h-[38px] flex items-center gap-x-2 px-[10px] rounded-[9px] text-[15px] font-semibold text-ml-bad hover:bg-ml-bad-soft transition-colors duration-150"
    >
      <Trash size={16} weight="bold" className="shrink-0" />
      Delete Selected
    </button>
  );
}
