import React, { useState, useEffect, useCallback } from "react";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Workspace from "@/models/workspace";
import ManageWorkspace, {
  useManageWorkspaceModal,
} from "../../Modals/ManageWorkspace";
import paths from "@/utils/paths";
import { Link, useParams, useNavigate, useMatch } from "react-router-dom";
import {
  CircleNotch,
  DotsSixVertical,
  GearSix,
  Plus,
  UploadSimple,
} from "@phosphor-icons/react";
import useUser from "@/hooks/useUser";
import ThreadContainer from "./ThreadContainer";
import startNewThread from "./startNewThread";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import showToast from "@/utils/toast";
import { LAST_VISITED_WORKSPACE } from "@/utils/constants";
import { safeJsonParse } from "@/utils/request";
import { isMobile } from "react-device-detect";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";
import WorkspaceTile, {
  WorkspaceTileGlyph,
  WORKSPACE_UPDATED_EVENT,
  liveWorkspaceFields,
} from "@/components/WorkspaceTile";

export const REFETCH_WORKSPACES_EVENT = "refetchWorkspaces";

// Document counts per workspace slug. The workspace list endpoint does not
// include documents, so each count comes from the workspace's own record
// (Workspace.bySlug). Cached across remounts so the rail does not flicker.
const docCountCache = new Map();
async function fetchDocCount(slug) {
  const workspace = await Workspace.bySlug(slug);
  if (!workspace || !Array.isArray(workspace.documents)) return null;
  docCountCache.set(slug, workspace.documents.length);
  return workspace.documents.length;
}

function useDocumentCounts(workspaces = []) {
  const [counts, setCounts] = useState(() => Object.fromEntries(docCountCache));

  const refresh = useCallback(async (slugs = []) => {
    const queue = [...slugs];
    const worker = async () => {
      while (queue.length) {
        const slug = queue.shift();
        try {
          const count = await fetchDocCount(slug);
          if (count !== null)
            setCounts((prev) =>
              prev[slug] === count ? prev : { ...prev, [slug]: count }
            );
        } catch {
          // A count is optional; leave it out when it cannot be read.
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  }, []);

  const slugKey = workspaces.map((ws) => ws.slug).join("|");
  useEffect(() => {
    if (!slugKey) return;
    refresh(slugKey.split("|"));
  }, [slugKey, refresh]);

  return { counts, refresh };
}

export default function ActiveWorkspaces({ showNewWsModal = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWs, setSelectedWs] = useState(null);
  const { showing, showModal, hideModal } = useManageWorkspaceModal();
  const { user } = useUser();
  const isInWorkspaceSettings = !!useMatch("/workspace/:slug/settings/:tab");
  const isHomePage = !!useMatch("/");
  const { counts, refresh: refreshCounts } = useDocumentCounts(workspaces);
  const canManage = user?.role !== "default";

  useEffect(() => {
    async function getWorkspaces() {
      const workspaces = await Workspace.all();
      setLoading(false);
      setWorkspaces(Workspace.orderWorkspaces(workspaces));
    }
    getWorkspaces();

    // Refetch when a workspace is created elsewhere in the app (eg: the
    // NewWorkspace modal) since those flows navigate via the router and no
    // longer trigger a full page reload.
    window.addEventListener(REFETCH_WORKSPACES_EVENT, getWorkspaces);
    return () =>
      window.removeEventListener(REFETCH_WORKSPACES_EVENT, getWorkspaces);
  }, []);

  // A saved rename or new icon shows in the rail right away.
  useEffect(() => {
    function onWorkspaceUpdated(e) {
      const saved = e?.detail?.workspace;
      if (!saved?.id) return;
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === saved.id ? { ...ws, ...liveWorkspaceFields(saved) } : ws
        )
      );
    }
    window.addEventListener(WORKSPACE_UPDATED_EVENT, onWorkspaceUpdated);
    return () =>
      window.removeEventListener(WORKSPACE_UPDATED_EVENT, onWorkspaceUpdated);
  }, []);

  /**
   * Reorders workspaces in the UI via localstorage on client side.
   * @param {number} startIndex - the index of the workspace to move
   * @param {number} endIndex - the index to move the workspace to
   */
  function reorderWorkspaces(startIndex, endIndex) {
    const reorderedWorkspaces = Array.from(workspaces);
    const [removed] = reorderedWorkspaces.splice(startIndex, 1);
    reorderedWorkspaces.splice(endIndex, 0, removed);
    setWorkspaces(reorderedWorkspaces);
    const success = Workspace.storeWorkspaceOrder(
      reorderedWorkspaces.map((w) => w.id)
    );
    if (!success) {
      showToast("Failed to reorder workspaces", "error");
      Workspace.all().then((workspaces) => setWorkspaces(workspaces));
    }
  }

  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderWorkspaces(result.source.index, result.destination.index);
  };

  // When on the home page, resolve which workspace should be virtually active
  const virtualActiveSlug = (() => {
    if (!isHomePage || workspaces.length === 0) return null;
    const lastVisited = safeJsonParse(
      localStorage.getItem(LAST_VISITED_WORKSPACE)
    );
    if (
      lastVisited?.slug &&
      workspaces.some((ws) => ws.slug === lastVisited.slug)
    )
      return lastVisited.slug;
    return workspaces[0]?.slug ?? null;
  })();

  const activeWorkspace =
    workspaces.find((ws) => ws.slug === (slug || virtualActiveSlug)) ?? null;

  return (
    <>
      <NewThreadButton workspace={activeWorkspace} loading={loading} />

      <div className="flex items-center justify-between shrink-0 mt-2 mr-[2px] mb-[2px] ml-[6px] min-h-[30px]">
        <span className="text-[14px] font-semibold text-ml-text-3">
          {t("settings.workspaces")}
        </span>
        {canManage && typeof showNewWsModal === "function" && (
          <button
            type="button"
            onClick={showNewWsModal}
            aria-label={t("new-workspace.title")}
            data-tooltip-id="new-workspace-tooltip"
            data-tooltip-content={t("new-workspace.title")}
            className="w-[30px] h-[30px] grid place-items-center rounded-[8px] border border-transparent text-ml-text-2 hover:text-ml-text hover:bg-ml-raised hover:border-ml-line transition-colors duration-150"
          >
            <Plus size={17} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-y-[6px] shrink-0" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton.default
              key={i}
              height={46}
              width="100%"
              borderRadius={12}
              baseColor="var(--ml-raised)"
              highlightColor="var(--ml-raised-2)"
              enableAnimation={true}
              containerClassName="block leading-none"
            />
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="workspaces">
            {(provided) => (
              <div
                role="list"
                aria-label={t("settings.workspaces")}
                className="flex flex-col gap-y-[6px] shrink-0"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {workspaces.map((workspace, index) => {
                  const isVirtuallyActive =
                    workspace.slug === virtualActiveSlug;
                  const isActive = workspace.slug === slug || isVirtuallyActive;
                  const inThisWsSettings =
                    isInWorkspaceSettings && workspace.slug === slug;
                  return (
                    <Draggable
                      key={workspace.id}
                      draggableId={workspace.id.toString()}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex flex-col w-full ${
                            snapshot.isDragging ? "opacity-80" : ""
                          }`}
                          role="listitem"
                        >
                          <WorkspaceRow
                            workspace={workspace}
                            isActive={isActive}
                            isDragging={snapshot.isDragging}
                            dragHandleProps={provided.dragHandleProps}
                            count={counts[workspace.slug]}
                            canManage={canManage}
                            inThisWsSettings={inThisWsSettings}
                            onUpload={() => {
                              setSelectedWs(workspace);
                              showModal();
                            }}
                            onSettings={() =>
                              navigate(
                                isInWorkspaceSettings
                                  ? paths.workspace.chat(workspace.slug)
                                  : paths.workspace.settings.generalAppearance(
                                      workspace.slug
                                    )
                              )
                            }
                            onOpen={() =>
                              navigate(paths.workspace.chat(workspace.slug))
                            }
                          />
                          {isActive && (
                            <ThreadContainer
                              workspace={workspace}
                              isActive={isActive}
                              isVirtualThread={isVirtuallyActive}
                            />
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      {showing && (
        <ManageWorkspace
          hideModal={() => {
            hideModal();
            if (selectedWs?.slug) refreshCounts([selectedWs.slug]);
          }}
          providedSlug={selectedWs ? selectedWs.slug : null}
        />
      )}
      <Tooltip
        id="new-workspace-tooltip"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </>
  );
}

const ROW_ICON_BUTTON =
  "w-[30px] h-[30px] place-items-center rounded-[8px] text-ml-text-3 hover:text-ml-text hover:bg-ml-raised-2 transition-colors duration-150";
// Row actions replace the document count while the row is hovered or has
// keyboard focus, so they stay one click away without crowding the row.
const REVEAL_ON_ROW = "hidden group-hover/ws:grid group-focus-within/ws:grid";
const HIDE_ON_ROW = "group-hover/ws:hidden group-focus-within/ws:hidden";

function WorkspaceRow({
  workspace,
  isActive,
  isDragging,
  dragHandleProps,
  count,
  canManage,
  inThisWsSettings,
  onUpload,
  onSettings,
  onOpen,
}) {
  const hasCount = typeof count === "number";
  // Touch devices have no hover, so their actions always show. While this
  // workspace's settings are open, its (highlighted) gear stays visible.
  const countClass = !canManage
    ? ""
    : isMobile || inThisWsSettings
      ? "hidden"
      : HIDE_ON_ROW;
  const uploadClass = isMobile ? "grid" : REVEAL_ON_ROW;
  const gearClass = isMobile || inThisWsSettings ? "grid" : REVEAL_ON_ROW;

  return (
    <div
      className={`group/ws relative flex items-center gap-x-3 h-[46px] shrink-0 pl-[10px] pr-[8px] rounded-[12px] transition-colors duration-150 ${
        isActive
          ? "bg-ml-raised text-ml-text shadow-[inset_0_0_0_1px_var(--ml-line)]"
          : "text-ml-text-2 hover:bg-ml-raised"
      } ${isDragging ? "shadow-ml-pop bg-ml-raised" : ""}`}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-[-14px] top-[11px] bottom-[11px] w-[3px] rounded-r-[3px] bg-ml-accent"
        />
      )}
      <WorkspaceTile
        {...dragHandleProps}
        workspace={workspace}
        selected={isActive}
        onClick={onOpen}
        aria-label={`Reorder ${workspace.name}`}
        title="Drag to reorder"
        className="group/tile cursor-grab active:cursor-grabbing"
      >
        <span className="grid place-items-center group-hover/tile:hidden">
          <WorkspaceTileGlyph name={workspace.name} icon={workspace.icon} />
        </span>
        <DotsSixVertical
          size={16}
          weight="bold"
          className="hidden group-hover/tile:block"
        />
      </WorkspaceTile>
      <Link
        to={paths.workspace.chat(workspace.slug)}
        aria-current={isActive ? "page" : undefined}
        className="flex flex-1 min-w-0 items-center self-stretch rounded-[8px]"
      >
        <span
          data-tooltip-id="workspace-name"
          data-tooltip-content={workspace.name}
          className={`flex-1 min-w-0 truncate text-[15.5px] font-semibold ${
            isActive ? "text-ml-text" : ""
          }`}
        >
          {workspace.name}
        </span>
      </Link>
      <div className="flex items-center justify-end gap-x-0.5 shrink-0 min-w-[30px] h-[30px]">
        {hasCount && (
          <span
            title={`${count} ${count === 1 ? "document" : "documents"}`}
            className={`ml-mono text-[13px] font-medium text-ml-text-3 pr-[2px] ${countClass}`}
          >
            {count}
          </span>
        )}
        {canManage && (
          <>
            <button
              type="button"
              onClick={onUpload}
              data-tooltip-id="upload-workspace"
              data-tooltip-content="Upload documents to this workspace for RAG indexing"
              aria-label="Upload documents to this workspace"
              className={`${ROW_ICON_BUTTON} ${uploadClass}`}
            >
              <UploadSimple size={18} />
            </button>
            <button
              type="button"
              onClick={onSettings}
              aria-label="General appearance settings"
              data-tooltip-id="gear-workspace"
              data-tooltip-content="General appearance settings"
              className={`${ROW_ICON_BUTTON} ${gearClass} ${
                inThisWsSettings ? "!text-ml-accent-text bg-ml-accent-soft" : ""
              }`}
            >
              <GearSix size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function NewThreadButton({ workspace, loading: workspacesLoading }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const disabled = !workspace || workspacesLoading || loading;

  const onClick = async () => {
    if (!workspace) return;
    setLoading(true);
    const { error } = await startNewThread(workspace.slug, navigate);
    if (error)
      showToast(`Could not create thread - ${error}`, "error", { clear: true });
    setLoading(false);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      title={workspace ? `New thread in ${workspace.name}` : undefined}
      className="w-full h-[42px] shrink-0 mt-1 mb-[6px] inline-flex items-center justify-center gap-x-2 px-4 rounded-[12px] border border-ml-line-2 bg-ml-raised text-ml-text text-[15px] font-semibold whitespace-nowrap transition-colors duration-150 enabled:hover:border-ml-accent-line disabled:cursor-not-allowed disabled:text-ml-text-2"
    >
      {loading ? (
        <CircleNotch size={18} className="animate-spin" />
      ) : (
        <Plus size={18} />
      )}
      {loading ? "Starting thread..." : "New thread"}
    </button>
  );
}
