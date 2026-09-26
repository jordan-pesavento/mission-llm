import React, { useEffect, useRef, useState } from "react";
import paths from "@/utils/paths";
import useLogo from "@/hooks/useLogo";
import {
  Cpu,
  Flask,
  GlobeHemisphereWest,
  List,
  LockKey,
  PaintBrush,
  PlugsConnected,
  Robot,
  Toolbox,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import useUser from "@/hooks/useUser";
import { isMobile } from "react-device-detect";
import { RailLinks } from "../Footer";
import { BackToWorkspacesButton } from "../SettingsButton";
import { RailUser } from "../UserMenu";
import RailBrand from "./RailBrand";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import showToast from "@/utils/toast";
import System from "@/models/system";
import Option from "./MenuOption";
import { CanViewChatHistoryProvider } from "../CanViewChatHistory";
import useAppVersion from "@/hooks/useAppVersion";

/**
 * Settings rail: the same flush rail as the workspace rail (64px brand band,
 * scrolling body, foot band with the user row) holding the real settings
 * groups.
 */
function RailBody({ user, t }) {
  return (
    <>
      <div className="flex items-center shrink-0 mt-2 mr-[2px] mb-[2px] ml-[6px]">
        <span className="text-[14px] leading-[21px] font-semibold text-ml-text-3">
          {t("settings.title")}
        </span>
      </div>
      <SidebarOptions user={user} t={t} />
      <div className="h-px shrink-0 bg-ml-line mx-[10px] my-2" />
      <div className="flex flex-col gap-y-1 shrink-0 px-[10px]">
        <SupportEmail />
        <Link
          hidden={user?.hasOwnProperty("role") && user.role !== "admin"}
          to={paths.settings.privacy()}
          className={RAIL_TEXT_LINK}
        >
          {t("settings.privacy")}
        </Link>
        <AppVersion />
      </div>
      <RailLinks />
    </>
  );
}

function RailFoot() {
  return (
    <div className="flex flex-col gap-y-[10px]">
      <BackToWorkspacesButton />
      <RailUser />
    </div>
  );
}

export default function SettingsSidebar() {
  const { t } = useTranslation();
  const { logo } = useLogo();
  const { user } = useUser();
  const sidebarRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBgOverlay, setShowBgOverlay] = useState(false);

  useEffect(() => {
    function handleBg() {
      if (showSidebar) {
        setTimeout(() => {
          setShowBgOverlay(true);
        }, 300);
      } else {
        setShowBgOverlay(false);
      }
    }
    handleBg();
  }, [showSidebar]);

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-ml-rail border-b border-ml-line text-ml-text-2 h-16">
          <button
            onClick={() => setShowSidebar(true)}
            aria-label="Open settings menu"
            className="w-ctl h-ctl grid place-items-center rounded-[10px] border border-ml-line-2 bg-ml-panel text-ml-text-2"
          >
            <List size={20} />
          </button>
          <div className="flex items-center justify-center flex-grow">
            <img
              src={logo}
              alt="Logo"
              className="block mx-auto h-6 w-auto"
              style={{ maxHeight: "40px", objectFit: "contain" }}
            />
          </div>
          <div className="w-12"></div>
        </div>
        <div
          style={{
            transform: showSidebar ? `translateX(0vw)` : `translateX(-100vw)`,
          }}
          className={`z-99 fixed top-0 left-0 transition-all duration-500 w-[100vw] h-[100vh]`}
        >
          <div
            className={`${
              showBgOverlay
                ? "transition-all opacity-1"
                : "transition-none opacity-0"
            }  duration-500 fixed top-0 left-0 bg-[var(--ml-scrim)] w-screen h-screen`}
            onClick={() => setShowSidebar(false)}
          />
          <nav
            ref={sidebarRef}
            aria-label="Settings"
            className="relative h-[100dvh] flex flex-col bg-ml-rail border-r border-ml-line w-[min(320px,86vw)]"
          >
            <div className="h-topbar shrink-0 flex items-center justify-between gap-x-2 pl-[18px] pr-3 border-b border-ml-line">
              <RailBrand />
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                aria-label="Close settings menu"
                className="w-ctl h-ctl shrink-0 grid place-items-center rounded-[10px] text-ml-text-2 hover:bg-ml-raised"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-[14px] flex flex-col gap-y-[6px]">
              <RailBody user={user} t={t} />
            </div>
            <div className="shrink-0 border-t border-ml-line px-[14px] py-3">
              <RailFoot />
            </div>
          </nav>
        </div>
      </>
    );
  }

  return (
    <>
      <nav
        data-frame="rail"
        data-settings-rail
        aria-label="Settings"
        className="relative shrink-0 h-full flex flex-col bg-ml-rail border-r border-ml-line"
        style={{ width: "var(--ml-rail-w)" }}
      >
        <div
          data-frame="rail-head"
          className="h-topbar shrink-0 flex items-center pl-[18px] pr-3 border-b border-ml-line"
        >
          <RailBrand />
        </div>
        <div
          ref={sidebarRef}
          data-frame="rail-body"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-[14px] flex flex-col gap-y-[6px]"
        >
          <RailBody user={user} t={t} />
        </div>
        <div
          data-frame="rail-foot"
          className="shrink-0 border-t border-ml-line px-[14px] py-3"
        >
          <RailFoot />
        </div>
      </nav>
    </>
  );
}

const RAIL_TEXT_LINK =
  "w-fit text-[14px] leading-[22px] text-ml-text-3 hover:text-ml-text transition-colors duration-150";

function SupportEmail() {
  const [supportEmail, setSupportEmail] = useState(paths.issues());
  const { t } = useTranslation();
  const isMailto = supportEmail.startsWith("mailto:");

  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(
        supportEmail?.email ? `mailto:${supportEmail.email}` : paths.issues()
      );
    };
    fetchSupportEmail();
  }, []);

  return (
    <Link
      to={supportEmail}
      target={isMailto ? undefined : "_blank"}
      rel={isMailto ? undefined : "noreferrer"}
      className={RAIL_TEXT_LINK}
    >
      {t("settings.contact")}
    </Link>
  );
}

const SidebarOptions = ({ user = null, t }) => (
  <CanViewChatHistoryProvider>
    {({ viewable: canViewChatHistory }) => (
      <>
        <Option
          btnText={t("settings.ai-providers")}
          icon={<Cpu size={20} />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.llm"),
              href: paths.settings.llmPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.vector-database"),
              href: paths.settings.vectorDatabase(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.embedder"),
              href: paths.settings.embedder.modelPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.text-splitting"),
              href: paths.settings.embedder.chunkingPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.image-generation"),
              href: paths.settings.imageGenerationPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.voice-speech"),
              href: paths.settings.audioPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.transcription"),
              href: paths.settings.transcriptionPreference(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.model-router"),
              href: paths.settings.modelRouters(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.admin")}
          icon={<UsersThree size={20} />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.users"),
              href: paths.settings.users(),
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.workspaces"),
              href: paths.settings.workspaces(),
              roles: ["admin", "manager"],
            },
            {
              hidden: !canViewChatHistory,
              btnText: t("settings.workspace-chats"),
              href: paths.settings.chats(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.invites"),
              href: paths.settings.invites(),
              roles: ["admin", "manager"],
            },
            {
              btnText: "Default System Prompt",
              href: paths.settings.defaultSystemPrompt(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.agent-skills")}
          icon={<Robot size={20} />}
          href={paths.settings.agentSkills()}
          user={user}
          flex={true}
          roles={["admin"]}
        />
        <Option
          btnText={t("settings.community-hub.title")}
          icon={<GlobeHemisphereWest size={20} />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.community-hub.trending"),
              href: paths.communityHub.trending(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.community-hub.your-account"),
              href: paths.communityHub.authentication(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.community-hub.import-item"),
              href: paths.communityHub.importItem(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.customization")}
          icon={<PaintBrush size={20} />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.interface"),
              href: paths.settings.interface(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.branding"),
              href: paths.settings.branding(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.chat"),
              href: paths.settings.chat(),
              flex: true,
              roles: ["admin", "manager"],
            },
          ]}
        />
        <Option
          btnText={t("settings.channels")}
          icon={<PlugsConnected size={20} />}
          user={user}
          childOptions={[
            {
              btnText: t("settings.available-channels.telegram"),
              href: paths.settings.telegram(),
              flex: true,
              hidden: !!user,
            },
          ]}
        />
        <Option
          btnText={t("settings.tools")}
          icon={<Toolbox size={20} />}
          user={user}
          childOptions={[
            {
              hidden: !canViewChatHistory,
              btnText: t("settings.embeds"),
              href: paths.settings.embedChatWidgets(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.event-logs"),
              href: paths.settings.logs(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.scheduled-jobs"),
              href: paths.settings.scheduledJobs(),
              flex: true,
              hidden: !!user,
            },
            {
              btnText: t("settings.api-keys"),
              href: paths.settings.apiKeys(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.system-prompt-variables"),
              href: paths.settings.systemPromptVariables(),
              flex: true,
              roles: ["admin"],
            },
            {
              btnText: t("settings.browser-extension"),
              href: paths.settings.browserExtension(),
              flex: true,
              roles: ["admin", "manager"],
            },
            {
              btnText: t("settings.mobile-app"),
              href: paths.settings.mobile(),
              flex: true,
              roles: ["admin"],
            },
          ]}
        />
        <Option
          btnText={t("settings.security")}
          icon={<LockKey size={20} />}
          href={paths.settings.security()}
          user={user}
          flex={true}
          roles={["admin", "manager"]}
          hidden={user?.role}
        />
        <HoldToReveal key="exp_features">
          <Option
            btnText={t("settings.experimental-features")}
            icon={<Flask size={20} />}
            href={paths.settings.experimental()}
            user={user}
            flex={true}
            roles={["admin"]}
          />
        </HoldToReveal>
      </>
    )}
  </CanViewChatHistoryProvider>
);

function HoldToReveal({ children, holdForMs = 3_000 }) {
  let timeout = null;
  const [showing, setShowing] = useState(
    window.localStorage.getItem(
      "missionllm_experimental_feature_preview_unlocked"
    )
  );

  useEffect(() => {
    const onPress = (e) => {
      if (!["Control", "Meta"].includes(e.key) || timeout !== null) return;
      timeout = setTimeout(() => {
        setShowing(true);
        // Setting toastId prevents hook spam from holding control too many times or the event not detaching
        showToast("Experimental feature previews unlocked!");
        window.localStorage.setItem(
          "missionllm_experimental_feature_preview_unlocked",
          "enabled"
        );
        window.removeEventListener("keypress", onPress);
        window.removeEventListener("keyup", onRelease);
        clearTimeout(timeout);
      }, holdForMs);
    };
    const onRelease = (e) => {
      if (!["Control", "Meta"].includes(e.key)) return;
      if (showing) {
        window.removeEventListener("keypress", onPress);
        window.removeEventListener("keyup", onRelease);
        clearTimeout(timeout);
        return;
      }
      clearTimeout(timeout);
    };

    if (!showing) {
      window.addEventListener("keydown", onPress);
      window.addEventListener("keyup", onRelease);
    }
    return () => {
      window.removeEventListener("keydown", onPress);
      window.removeEventListener("keyup", onRelease);
    };
  }, []);

  if (!showing) return null;
  return children;
}

function AppVersion() {
  const { version, isLoading } = useAppVersion();
  if (isLoading) return null;
  return (
    <Link
      to={paths.releases()}
      target="_blank"
      rel="noreferrer"
      className={`${RAIL_TEXT_LINK} ml-mono`}
    >
      v{version}
    </Link>
  );
}
