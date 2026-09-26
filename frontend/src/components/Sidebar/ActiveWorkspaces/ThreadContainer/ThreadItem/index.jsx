import useScrollActiveItemIntoView from "@/hooks/useScrollActiveItemIntoView";
import Workspace from "@/models/workspace";
import paths from "@/utils/paths";
import showToast from "@/utils/toast";
import {
  ArrowCounterClockwise,
  DotsThree,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { THREAD_RENAME_EVENT } from "../events";

const ROW_ICON_BUTTON =
  "w-[28px] h-[28px] grid place-items-center rounded-[7px] text-ml-text-3 hover:text-ml-text hover:bg-ml-raised-2 transition-colors duration-150";

export default function ThreadItem({
  isActive,
  workspace,
  thread,
  onRemove,
  toggleMarkForDeletion,
  ctrlPressed = false,
}) {
  const { slug: urlSlug, threadSlug = null } = useParams();
  const workspaceSlug = workspace?.slug ?? urlSlug;
  const optionsContainer = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const linkTo = thread.virtual
    ? "/"
    : !thread.slug
      ? paths.workspace.chat(workspaceSlug)
      : paths.workspace.thread(workspaceSlug, thread.slug);

  const { ref } = useScrollActiveItemIntoView({
    isActive,
    behavior: "instant",
    block: "center",
  });

  const hasOptions = !!thread.slug && !thread.deleted && !thread.virtual;
  return (
    <div
      role="listitem"
      className={`group/thread relative flex items-center h-[38px] shrink-0 rounded-[9px] transition-colors duration-150 ${
        isActive && !thread.deleted
          ? "bg-ml-accent-soft text-ml-text font-medium"
          : "text-ml-text-2 hover:bg-ml-raised"
      }`}
    >
      {thread.deleted ? (
        <div className="flex flex-1 min-w-0 items-center justify-between pl-[10px] pr-[5px]">
          <p className="text-[15px] italic text-ml-text-3 truncate">
            deleted thread
          </p>
          {ctrlPressed && (
            <button
              type="button"
              className={ROW_ICON_BUTTON}
              onClick={() => toggleMarkForDeletion(thread.id)}
              aria-label="Restore thread"
            >
              <ArrowCounterClockwise size={16} />
            </button>
          )}
        </div>
      ) : (
        <Link
          ref={ref}
          to={linkTo}
          data-tooltip-id="workspace-thread-name"
          data-tooltip-content={thread.name}
          className={`flex flex-1 min-w-0 items-center self-stretch pl-[10px] pr-[10px] rounded-[9px] ${
            hasOptions
              ? showOptions || ctrlPressed
                ? "!pr-[36px]"
                : "max-md:pr-[36px] group-hover/thread:pr-[36px] group-focus-within/thread:pr-[36px]"
              : ""
          }`}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="text-[15px] truncate">{thread.name}</span>
        </Link>
      )}
      {hasOptions && (
        <div
          ref={optionsContainer}
          className={`absolute right-[5px] top-[5px] flex items-center ${
            showOptions ? "z-20" : ""
          }`}
        >
          {ctrlPressed ? (
            <button
              type="button"
              className={ROW_ICON_BUTTON}
              onClick={() => toggleMarkForDeletion(thread.id)}
              aria-label="Mark thread for deletion"
            >
              <X size={16} weight="bold" />
            </button>
          ) : (
            <button
              type="button"
              className={`${ROW_ICON_BUTTON} ${
                showOptions
                  ? "visible bg-ml-raised-2 text-ml-text"
                  : "md:invisible md:group-hover/thread:visible md:group-focus-within/thread:visible"
              }`}
              onClick={() => setShowOptions(!showOptions)}
              aria-label="Thread options"
              aria-haspopup="menu"
              aria-expanded={showOptions}
            >
              <DotsThree size={20} weight="bold" />
            </button>
          )}
          {showOptions && (
            <OptionsMenu
              containerRef={optionsContainer}
              workspace={workspace}
              thread={thread}
              onRemove={onRemove}
              close={() => setShowOptions(false)}
              currentThreadSlug={threadSlug}
            />
          )}
        </div>
      )}
    </div>
  );
}

function OptionsMenu({
  containerRef,
  workspace,
  thread,
  onRemove,
  close,
  currentThreadSlug,
}) {
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Close on an outside click or Escape. The menu is only mounted while it
  // is open, so the listeners live exactly as long as the menu.
  useEffect(() => {
    const outsideClick = (e) => {
      if (!menuRef.current) return;
      if (
        !menuRef.current.contains(e.target) &&
        !containerRef.current?.contains(e.target)
      )
        close();
    };
    const isEsc = (e) => {
      if (e.key === "Escape" || e.key === "Esc") close();
    };
    window.document.addEventListener("click", outsideClick);
    window.document.addEventListener("keyup", isEsc);
    return () => {
      window.document.removeEventListener("click", outsideClick);
      window.document.removeEventListener("keyup", isEsc);
    };
  }, []);

  const renameThread = async () => {
    const name = window
      .prompt("What would you like to rename this thread to?")
      ?.trim();
    if (!name || name.length === 0) {
      close();
      return;
    }

    const { message } = await Workspace.threads.update(
      workspace.slug,
      thread.slug,
      { name }
    );
    if (!!message) {
      showToast(`Thread could not be updated! ${message}`, "error", {
        clear: true,
      });
      close();
      return;
    }

    // Same event an automatic rename fires, so the rail and the chat top
    // bar both show the new name.
    window.dispatchEvent(
      new CustomEvent(THREAD_RENAME_EVENT, {
        detail: { threadSlug: thread.slug, newName: name },
      })
    );
    close();
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this thread? All of its chats will be deleted. You cannot undo this."
      )
    )
      return;
    const success = await Workspace.threads.delete(workspace.slug, thread.slug);
    if (!success) {
      showToast("Thread could not be deleted!", "error", { clear: true });
      return;
    }
    if (success) {
      showToast("Thread deleted successfully!", "success", { clear: true });
      onRemove(thread.id);
      // Redirect if deleting the active thread. Use router navigation so
      // ActiveGenerationGuard can intercept if a response is generating.
      if (currentThreadSlug === thread.slug) {
        navigate(paths.workspace.chat(workspace.slug));
      }
      return;
    }
  };

  const itemClass =
    "w-full h-[36px] flex items-center gap-x-2.5 px-3 rounded-[8px] text-[15px] font-medium whitespace-nowrap transition-colors duration-150";
  return (
    <div
      ref={menuRef}
      role="menu"
      className="absolute z-[20] top-[calc(100%+4px)] right-0 w-max min-w-[180px] p-1.5 flex flex-col gap-y-0.5 rounded-[12px] bg-ml-raised border border-ml-line-2 shadow-ml-pop"
    >
      <button
        onClick={renameThread}
        type="button"
        role="menuitem"
        className={`${itemClass} text-ml-text hover:bg-ml-raised-2`}
      >
        <PencilSimple size={17} className="text-ml-text-2" />
        Rename
      </button>
      <button
        onClick={handleDelete}
        type="button"
        role="menuitem"
        className={`${itemClass} text-ml-bad hover:bg-ml-bad-soft`}
      >
        <Trash size={17} />
        Delete Thread
      </button>
    </div>
  );
}
