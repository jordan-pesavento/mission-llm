import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Workspace from "@/models/workspace";
import PasswordModal, { usePasswordModal } from "@/components/Modals/Password";
import { isMobile } from "react-device-detect";
import { FullScreenLoader } from "@/components/Preloader";
import {
  ArrowUUpLeft,
  ChatText,
  Database,
  Robot,
  User,
  Wrench,
} from "@phosphor-icons/react";
import paths from "@/utils/paths";
import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
import GeneralAppearance from "./GeneralAppearance";
import ChatSettings from "./ChatSettings";
import VectorDatabase from "./VectorDatabase";
import Members from "./Members";
import WorkspaceAgentConfiguration from "./AgentConfig";
import useUser from "@/hooks/useUser";
import { useTranslation } from "react-i18next";
import System from "@/models/system";
import { initialsFor } from "@/components/WorkspaceChat/ChatContainer/chatUi";

const TABS = {
  "general-appearance": GeneralAppearance,
  "chat-settings": ChatSettings,
  "vector-database": VectorDatabase,
  members: Members,
  "agent-config": WorkspaceAgentConfiguration,
};

export default function WorkspaceSettings() {
  const { loading, requiresAuth, mode } = usePasswordModal();

  if (loading) return <FullScreenLoader />;
  if (requiresAuth !== false) {
    return <>{requiresAuth !== null && <PasswordModal mode={mode} />}</>;
  }

  return <ShowWorkspaceChat />;
}

function ShowWorkspaceChat() {
  const { t } = useTranslation();
  const { slug, tab } = useParams();
  const { user } = useUser();
  const [workspace, setWorkspace] = useState(null);
  const [deletionProtected, setDeletionProtected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getWorkspace() {
      if (!slug) return;
      const _workspace = await Workspace.bySlug(slug);
      if (!_workspace) {
        setLoading(false);
        return;
      }

      const _settings = await System.keys();
      const suggestedMessages = await Workspace.getSuggestedMessages(slug);
      setWorkspace({
        ..._workspace,
        vectorDB: _settings?.VectorDB,
        suggestedMessages,
      });
      setDeletionProtected(_settings?.WorkspaceDeletionProtection === true);
      setLoading(false);
    }
    getWorkspace();
  }, [slug, tab]);

  if (loading) return <FullScreenLoader />;

  const TabContent = TABS[tab];
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      {!isMobile && <Sidebar />}
      <div
        style={{ height: "100%" }}
        className="relative bg-ml-ground w-full h-full min-w-0 overflow-y-auto"
      >
        {/* The rail cannot collapse on settings routes (useSidebarToggle), so
            this bar never needs room for the expand button. */}
        <div className="h-topbar flex items-center gap-2.5 px-gutter border-b border-ml-line">
          <Link
            to={paths.workspace.chat(slug)}
            aria-label={t("common.back", { defaultValue: "Back" })}
            title={t("common.back", { defaultValue: "Back" })}
            className="w-ctl h-ctl shrink-0 grid place-items-center rounded-[10px] border border-ml-line-2 bg-ml-panel text-ml-text-2 transition-colors duration-150 hover:border-ml-accent-line hover:text-ml-text"
          >
            <ArrowUUpLeft className="h-[18px] w-[18px]" weight="bold" />
          </Link>
          {workspace?.name && (
            <>
              <span
                aria-hidden="true"
                className="w-[30px] h-[30px] shrink-0 grid place-items-center rounded-[9px] border border-ml-accent-line bg-ml-accent-soft text-ml-accent-text font-mono font-semibold text-[13px]"
              >
                {initialsFor(workspace.name)}
              </span>
              <strong className="min-w-0 truncate whitespace-nowrap font-semibold text-[15.5px] text-ml-text">
                {workspace.name}
              </strong>
            </>
          )}
        </div>
        <nav
          aria-label="Workspace settings"
          className="flex gap-0.5 px-gutter border-b border-ml-line overflow-x-auto no-scroll"
          data-scrollx
        >
          <TabItem
            title={t("workspaces—settings.general")}
            icon={<Wrench size={18} />}
            to={paths.workspace.settings.generalAppearance(slug)}
          />
          <TabItem
            title={t("workspaces—settings.chat")}
            icon={<ChatText size={18} />}
            to={paths.workspace.settings.chatSettings(slug)}
          />
          <TabItem
            title={t("workspaces—settings.vector")}
            icon={<Database size={18} />}
            to={paths.workspace.settings.vectorDatabase(slug)}
          />
          <TabItem
            title={t("workspaces—settings.members")}
            icon={<User size={18} />}
            to={paths.workspace.settings.members(slug)}
            visible={["admin", "manager"].includes(user?.role)}
          />
          <TabItem
            title={t("workspaces—settings.agent")}
            icon={<Robot size={18} />}
            to={paths.workspace.settings.agentConfig(slug)}
          />
        </nav>
        <div data-settings-pane className="px-gutter pt-2 pb-10">
          <TabContent
            slug={slug}
            workspace={workspace}
            deletionProtected={deletionProtected}
          />
        </div>
      </div>
    </div>
  );
}

function TabItem({ title, icon, to, visible = true }) {
  if (!visible) return null;
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `h-12 shrink-0 inline-flex items-center gap-2 px-3.5 -mb-px border-b-2 font-semibold text-[15px] whitespace-nowrap transition-colors duration-150 ${
          isActive
            ? "border-ml-accent text-ml-text"
            : "border-transparent text-ml-text-2 hover:text-ml-text"
        }`
      }
    >
      {icon}
      <span>{title}</span>
    </NavLink>
  );
}
