import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isMobile } from "react-device-detect";
import useUser from "@/hooks/useUser";
import { useModal } from "@/hooks/useModal";
import LLMSelectorModal from "../PromptInput/LLMSelector/index";
import SetupProvider from "../PromptInput/LLMSelector/SetupProvider";
import {
  SAVE_LLM_SELECTOR_EVENT,
  PROVIDER_SETUP_EVENT,
} from "../PromptInput/LLMSelector/action";
import Workspace from "@/models/workspace";
import System from "@/models/system";
import ModelRouterAPI from "@/models/modelRouter";
import { CaretDown } from "@phosphor-icons/react";
import { MENU_SURFACE } from "../chatUi";

async function resolveModelName(workspace, systemSettings, t) {
  if (!workspace) return "";
  const effectiveProvider =
    workspace.chatProvider ?? systemSettings?.LLMProvider;

  if (effectiveProvider !== "missionllm-router")
    return workspace.chatModel ?? systemSettings?.LLMModel ?? "";

  const routerId = workspace.router_id || systemSettings?.ModelRouterId;
  if (!routerId) return t("model-router.metrics.model-router-default");

  const { router } = await ModelRouterAPI.get(routerId);
  if (!router?.name) return t("model-router.metrics.model-router-default");

  return router.name;
}

async function fetchModelName(slug, setModelName, t) {
  if (!slug) return;
  const [workspace, systemSettings] = await Promise.all([
    Workspace.bySlug(slug),
    System.keys(),
  ]);
  setModelName(await resolveModelName(workspace, systemSettings, t));
}

export default function WorkspaceModelPicker({ workspaceSlug = null }) {
  const { t } = useTranslation();
  const { slug: urlSlug } = useParams();
  const slug = urlSlug ?? workspaceSlug;
  const { user } = useUser();
  const [showSelector, setShowSelector] = useState(false);
  const [modelName, setModelName] = useState("");
  const {
    isOpen: isSetupProviderOpen,
    openModal: openSetupProviderModal,
    closeModal: closeSetupProviderModal,
  } = useModal();
  const [config, setConfig] = useState({ settings: {}, provider: null });
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch current model name for display
  useEffect(() => {
    fetchModelName(slug, setModelName, t);
  }, [slug]);

  // Close selector and refresh model name when model is saved
  useEffect(() => {
    function handleSave() {
      setShowSelector(false);
      fetchModelName(slug, setModelName, t);
    }
    window.addEventListener(SAVE_LLM_SELECTOR_EVENT, handleSave);
    return () =>
      window.removeEventListener(SAVE_LLM_SELECTOR_EVENT, handleSave);
  }, [slug]);

  // Handle provider setup request
  useEffect(() => {
    function handleProviderSetup(e) {
      const { provider, settings } = e.detail;
      setConfig({ settings, provider });
      setTimeout(() => openSetupProviderModal(), 300);
    }
    window.addEventListener(PROVIDER_SETUP_EVENT, handleProviderSetup);
    return () =>
      window.removeEventListener(PROVIDER_SETUP_EVENT, handleProviderSetup);
  }, []);

  if (!slug || isMobile) return null;

  // Picking a model is admin-only on multi-user instances (unchanged). Other
  // users still see which model answers, read-only.
  const canPick = !user || user.role === "admin";
  if (!canPick) {
    if (!modelName) return null;
    return (
      <span
        title={modelName}
        className="h-ctl min-w-0 max-w-[16rem] inline-flex items-center px-3 rounded-[10px] border border-ml-line-2 bg-ml-panel font-mono font-medium text-[14px] text-ml-text"
      >
        <span className="truncate">{modelName}</span>
      </span>
    );
  }

  return (
    <>
      {showSelector && (
        <div
          data-row-skip
          className="fixed inset-0 z-20"
          onClick={() => setShowSelector(false)}
        />
      )}
      <div className="relative z-30 min-w-0 shrink">
        <button
          type="button"
          onClick={() => setShowSelector(!showSelector)}
          aria-haspopup="dialog"
          aria-expanded={showSelector}
          title={modelName || t("chat_window.select_model")}
          className={`h-ctl max-w-[18rem] w-full inline-flex items-center gap-[9px] px-3 rounded-[10px] border font-mono font-medium text-[14px] text-ml-text whitespace-nowrap cursor-pointer transition-colors duration-150 ${
            showSelector
              ? "border-ml-accent-line bg-ml-accent-soft"
              : "border-ml-line-2 bg-ml-panel hover:border-ml-accent-line"
          }`}
        >
          <span className="truncate min-w-0">
            {modelName || t("chat_window.select_model")}
          </span>
          <CaretDown
            size={14}
            weight="bold"
            className="shrink-0 text-ml-text-3"
          />
        </button>

        {showSelector && (
          <div
            className={`absolute right-0 top-[calc(100%+8px)] w-[620px] max-w-[calc(100vw-2rem)] overflow-hidden ${MENU_SURFACE} !bg-ml-panel`}
          >
            <LLMSelectorModal
              key={refreshKey}
              workspaceSlug={slug}
              initialProvider={config.provider?.value}
            />
          </div>
        )}
      </div>

      <SetupProvider
        isOpen={isSetupProviderOpen}
        closeModal={closeSetupProviderModal}
        postSubmit={() => {
          closeSetupProviderModal();
          setRefreshKey((k) => k + 1);
        }}
        settings={config.settings}
        llmProvider={config.provider}
      />
    </>
  );
}
