import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Books } from "@phosphor-icons/react";
import Workspace from "@/models/workspace";
import { SIDEBAR_TOGGLE_EVENT } from "@/components/Sidebar/SidebarToggle";
import { THREAD_RENAME_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";
import WorkspaceModelPicker from "../WorkspaceModelPicker";
import ChatSettingsMenu from "../ChatSettingsMenu";
import { useSourcesSidebar } from "../ChatSidebar";
import { initialsFor } from "../chatUi";
import { TopBarUser } from "@/components/UserMenu";

const SIDEBAR_TOGGLE_STORAGE_KEY = "missionllm_sidebar_toggle";

// Left padding of a 64px bar while the rail is collapsed: the expand button
// sits at the gutter (aligned with the thread and composer), then a 10px gap.
export const RAIL_COLLAPSED_BAR_PAD =
  "calc(var(--ml-gutter) + var(--ml-ctl) + 10px)";

/**
 * True while the left rail is collapsed. The rail's expand button then sits
 * over the main pane at the gutter, so top bars reserve room for it.
 */
export function useRailCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return (
        window.localStorage.getItem(SIDEBAR_TOGGLE_STORAGE_KEY) === "closed"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const onToggle = (e) => setCollapsed(e?.detail?.open === false);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, onToggle);
  }, []);
  return collapsed;
}

/**
 * The name of the open thread, kept in sync with renames from the rail and
 * the automatic rename after the first reply.
 */
function useThreadName(workspaceSlug, threadSlug) {
  const [name, setName] = useState(null);

  useEffect(() => {
    setName(null);
    if (!workspaceSlug || !threadSlug) return;
    let cancelled = false;
    Workspace.threads
      .all(workspaceSlug)
      .then(({ threads = [] }) => {
        if (cancelled) return;
        const match = threads.find((thread) => thread.slug === threadSlug);
        setName(match?.name ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspaceSlug, threadSlug]);

  useEffect(() => {
    if (!threadSlug) return;
    const onRename = (e) => {
      if (e?.detail?.threadSlug === threadSlug && e.detail.newName)
        setName(e.detail.newName);
    };
    window.addEventListener(THREAD_RENAME_EVENT, onRename);
    return () => window.removeEventListener(THREAD_RENAME_EVENT, onRename);
  }, [threadSlug]);

  return name;
}

/**
 * The 64px bar at the top of the chat pane: workspace tile and breadcrumb on
 * the left; the model pill, the Sources toggle, the chat settings ("more")
 * button and the user avatar on the right. Shares its height and hairline with the rail's brand
 * band and the drawer head.
 *
 * @param {Object} props
 * @param {Object|null} props.workspace
 * @param {string|null} props.threadSlug
 * @param {Array} props.history - chat history (for export and Sources)
 * @param {boolean} [props.showSources] - render the Sources toggle
 */
export default function ChatTopBar({
  workspace = null,
  threadSlug = null,
  history = [],
  showSources = false,
}) {
  const { t } = useTranslation();
  const railCollapsed = useRailCollapsed();
  const threadName = useThreadName(workspace?.slug, threadSlug);
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar: closeSources,
  } = useSourcesSidebar();

  // The Sources toggle opens the drawer on the most recent answer that cited
  // documents. Clicking a source chip under any answer opens that answer's.
  const latestSources =
    [...history]
      .reverse()
      .find((msg) => msg?.role === "assistant" && msg?.sources?.length > 0)
      ?.sources ?? null;

  function toggleSources() {
    if (sidebarOpen) closeSources();
    else if (latestSources) openSidebar(latestSources);
  }

  return (
    <header
      data-chat-topbar
      className="relative z-20 h-topbar shrink-0 flex items-center gap-2.5 px-gutter border-b border-ml-line bg-ml-ground"
      style={
        railCollapsed ? { paddingLeft: RAIL_COLLAPSED_BAR_PAD } : undefined
      }
    >
      {/* The crumb area is a size container: when it gets narrow the tile
          stands in for the workspace name so the thread title keeps the
          room, as in the concept. (Only this area is a container, so menus
          and overlays in the bar are not clipped by containment.) */}
      <div className="flex-1 min-w-0 [container-type:inline-size]">
        {workspace && (
          <div
            data-align={railCollapsed ? undefined : "chat:left"}
            className="flex items-center gap-2.5 min-w-0 text-[15.5px] text-ml-text-2"
          >
            <span
              aria-hidden="true"
              title={workspace.name}
              className="w-[30px] h-[30px] shrink-0 grid place-items-center rounded-[9px] border border-ml-accent-line bg-ml-accent-soft text-ml-accent-text font-mono font-semibold text-[13px]"
            >
              {initialsFor(workspace.name)}
            </span>
            <span
              className={`whitespace-nowrap truncate ${
                threadName
                  ? "shrink-[3] min-w-[3rem] [@container(max-width:380px)]:sr-only [@container(max-width:380px)]:[text-overflow:clip]"
                  : "font-semibold text-ml-text"
              }`}
              title={workspace.name}
            >
              {workspace.name}
            </span>
            {threadName && (
              <>
                <span
                  aria-hidden="true"
                  className="shrink-0 text-ml-text-3 [@container(max-width:380px)]:hidden"
                >
                  /
                </span>
                <strong
                  className="min-w-0 truncate whitespace-nowrap font-semibold text-ml-text"
                  title={threadName}
                >
                  {threadName}
                </strong>
              </>
            )}
          </div>
        )}
      </div>
      <div
        data-row="chat-topbar"
        data-align="chat:right"
        className="flex items-center gap-2.5 min-w-0 shrink-0"
      >
        <WorkspaceModelPicker workspaceSlug={workspace?.slug} />
        {showSources && (
          <button
            type="button"
            onClick={toggleSources}
            disabled={!latestSources && !sidebarOpen}
            aria-pressed={sidebarOpen}
            className={`h-ctl shrink-0 inline-flex items-center gap-[9px] px-3 rounded-[10px] border font-semibold text-[14.5px] whitespace-nowrap transition-colors duration-150 disabled:cursor-default disabled:opacity-50 ${
              sidebarOpen
                ? "border-ml-accent-line bg-ml-accent-soft text-ml-text cursor-pointer min-[1241px]:max-[1365px]:px-[9px]"
                : "border-ml-line-2 bg-ml-panel text-ml-text-2 cursor-pointer enabled:hover:border-ml-accent-line enabled:hover:text-ml-text"
            }`}
          >
            <Books size={18} />
            {/* With the drawer docked on a laptop-width screen the bar is
                narrow, so the toggle shows its icon only and the thread
                title keeps the room. The label stays for screen readers. */}
            <span
              className={
                sidebarOpen ? "min-[1241px]:max-[1365px]:sr-only" : undefined
              }
            >
              {t("chat_window.sources")}
            </span>
          </button>
        )}
        <ChatSettingsMenu
          history={history}
          workspace={workspace}
          threadSlug={threadSlug}
        />
        <TopBarUser />
      </div>
    </header>
  );
}
