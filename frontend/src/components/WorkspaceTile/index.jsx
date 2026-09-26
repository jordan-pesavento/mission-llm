import { useEffect, useState } from "react";
import { initialsFor } from "@/components/WorkspaceChat/ChatContainer/chatUi";
import { WORKSPACE_ICON_COMPONENTS } from "./icons";
import { tileColorKey, tileIconKey } from "./iconLibrary";

/**
 * Fired after a workspace is saved, with the saved row as detail.workspace,
 * so the rail and the headers follow a rename or a new icon without a reload.
 */
export const WORKSPACE_UPDATED_EVENT = "workspaceUpdated";

// Fields a save can change that the rail and the headers show.
const LIVE_FIELDS = ["name", "icon", "iconColor"];

function dispatchWorkspaceUpdate(workspace) {
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_UPDATED_EVENT, { detail: { workspace } })
  );
}

// Other open tabs of the app hear about a save too, so their rail and
// headers do not keep the old name or tile until a reload.
const updatesChannel =
  typeof BroadcastChannel === "function"
    ? new BroadcastChannel("missionllm-workspace-updates")
    : null;
if (updatesChannel) {
  updatesChannel.onmessage = (e) => {
    if (e?.data?.id) dispatchWorkspaceUpdate(e.data);
  };
  // In development, a hot reload of this file must not leave a second
  // listener behind.
  import.meta.hot?.dispose(() => updatesChannel.close());
}

/**
 * Tells the rest of the app, in this tab and any other open tab, that a
 * workspace was saved.
 * @param {Object|null} workspace the saved workspace row
 */
export function announceWorkspaceUpdate(workspace) {
  if (!workspace?.id) return;
  dispatchWorkspaceUpdate(workspace);
  try {
    updatesChannel?.postMessage({
      id: workspace.id,
      ...liveWorkspaceFields(workspace),
    });
  } catch {
    // Another tab missing a live update is not worth failing the save over.
  }
}

/**
 * The fields of a saved workspace that the rail and the headers show.
 * @param {Object} workspace
 * @returns {Object}
 */
export function liveWorkspaceFields(workspace) {
  return Object.fromEntries(
    LIVE_FIELDS.filter((field) => field in workspace).map((field) => [
      field,
      workspace[field],
    ])
  );
}

/**
 * `workspace` with any later save of the same workspace applied (name, icon,
 * color), for views that loaded the workspace once.
 * @param {Object|null} workspace
 * @returns {Object|null}
 */
export function useLiveWorkspace(workspace) {
  const [saved, setSaved] = useState(null);
  const id = workspace?.id ?? null;

  useEffect(() => {
    setSaved(null);
    if (!id) return;
    const onUpdate = (e) => {
      const next = e?.detail?.workspace;
      if (next?.id === id) setSaved(liveWorkspaceFields(next));
    };
    window.addEventListener(WORKSPACE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORKSPACE_UPDATED_EVENT, onUpdate);
  }, [id]);

  return workspace && saved ? { ...workspace, ...saved } : workspace;
}

/**
 * Icon size for a tile: 18px in the 30px rail tile, the same visual weight
 * as the 13px initials.
 * @param {number} size tile size in px
 */
function glyphSize(size) {
  return Math.round(size * 0.6);
}

/**
 * What a tile shows: the library icon when one is set, otherwise the
 * workspace initials.
 */
export function WorkspaceTileGlyph({ name = "", icon = null, size = 30 }) {
  const key = tileIconKey(icon);
  const Icon = key ? WORKSPACE_ICON_COMPONENTS[key] : null;
  if (Icon)
    return <Icon size={glyphSize(size)} weight="regular" aria-hidden="true" />;
  return initialsFor(name);
}

/**
 * The square workspace tile used everywhere a workspace is shown (rail,
 * chat top bar, workspace settings, search, the icon picker preview).
 *
 * `selected` marks the open workspace. A tile in the default color keeps
 * today's look: tinted with the accent when selected, neutral otherwise. A
 * tile with a palette color is tinted with it everywhere; the rail row's own
 * highlight marks which workspace is open.
 *
 * `name`, `icon` and `iconColor` default to the workspace's and can be set
 * directly (the picker previews unsaved values). Pass `children` to replace
 * the glyph (the rail swaps in its drag handle on hover).
 *
 * @param {Object} props
 * @param {Object|null} [props.workspace]
 * @param {string} [props.name]
 * @param {string|null} [props.icon] library key, or null for initials
 * @param {string|null} [props.iconColor] palette key, or null for the accent
 * @param {number} [props.size] edge length in px (30 in the rail)
 * @param {boolean} [props.selected]
 */
export default function WorkspaceTile({
  workspace = null,
  name = workspace?.name ?? "",
  icon = workspace?.icon ?? null,
  iconColor = workspace?.iconColor ?? null,
  size = 30,
  selected = true,
  as: Tag = "span",
  className = "",
  style = null,
  children = null,
  ...props
}) {
  const colorKey = tileColorKey(iconColor);
  return (
    <Tag
      {...props}
      data-tone={selected || colorKey ? "tint" : "neutral"}
      className={`ml-ws-tile ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        fontSize: Math.max(13, Math.round(size * 0.43)),
        ...(colorKey ? { "--ws-tile": `var(--ml-tile-${colorKey})` } : null),
        ...style,
      }}
    >
      {children ?? <WorkspaceTileGlyph name={name} icon={icon} size={size} />}
    </Tag>
  );
}
