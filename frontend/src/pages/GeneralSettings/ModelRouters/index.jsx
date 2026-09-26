import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Sidebar from "@/components/SettingsSidebar";
import { CircleNotch, PencilSimple, X } from "@phosphor-icons/react";
import ModelRouter from "@/models/modelRouter";
import { useModal } from "@/hooks/useModal";
import showToast from "@/utils/toast";
import paths from "@/utils/paths";
import NewRouterModal from "./NewRouterModal";

export default function ModelRouters() {
  const { t } = useTranslation();
  const { isOpen, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(true);
  const [routers, setRouters] = useState([]);
  const [editingRouter, setEditingRouter] = useState(null);

  const openCreateModal = () => {
    setEditingRouter(null);
    openModal();
  };

  const openEditModal = (router) => {
    setEditingRouter(router);
    openModal();
  };

  const handleModalClose = () => {
    closeModal();
    setEditingRouter(null);
  };

  const fetchRouters = async () => {
    const results = await ModelRouter.getAll();
    setRouters(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchRouters();
  }, []);

  const removeRouter = (id) => {
    setRouters((prev) => prev.filter((r) => r.id !== id));
  };

  const isEmpty = !loading && routers.length === 0;

  if (loading)
    return (
      <Layout t={t}>
        <LoadingState />
      </Layout>
    );

  if (isEmpty)
    return (
      <Layout t={t}>
        <EmptyState onCreateClick={openCreateModal} t={t} />
        <NewRouterModal
          isOpen={isOpen}
          closeModal={handleModalClose}
          onSuccess={fetchRouters}
          router={editingRouter}
        />
      </Layout>
    );

  return (
    <Layout t={t} showAction={!isEmpty} onAction={openCreateModal}>
      <RouterList
        routers={routers}
        removeRouter={removeRouter}
        openEditModal={openEditModal}
      />
      <NewRouterModal
        isOpen={isOpen}
        closeModal={handleModalClose}
        onSuccess={fetchRouters}
        router={editingRouter}
      />
    </Layout>
  );
}

function Layout({ t, showAction, onAction, children }) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex md:mt-0 mt-6">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative bg-theme-bg-primary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-0 py-16">
          <div className="flex items-center flex-wrap gap-4 justify-between pt-[22px] pb-4 border-b border-ml-line">
            <div className="flex flex-col gap-y-2">
              <p className="font-display [font-stretch:112%] font-[650] text-[27px] leading-[1.2] tracking-[0.01em] text-ml-text">
                {t("model-router.title")}
              </p>
              <p className="text-[16px] leading-[1.5] text-ml-text-2 max-w-[760px]">
                {t("model-router.description")}
              </p>
            </div>
            {showAction && (
              <button
                onClick={onAction}
                className="shrink-0 h-ctl-lg inline-flex items-center justify-center gap-2 px-4 rounded-[11px] border border-transparent bg-ml-accent-fill text-ml-on-accent text-[15px] font-semibold whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter] duration-150 hover:brightness-110"
              >
                {t("model-router.new-router-button")}
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-col">
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr_88px] gap-x-4 px-4 text-[14px] font-semibold text-ml-text-2 leading-5">
              <span>{t("model-router.table.name")}</span>
              <span>{t("model-router.table.fallback")}</span>
              <span>{t("model-router.table.rules")}</span>
              <span>{t("model-router.table.workspaces")}</span>
              <span aria-hidden="true" />
            </div>
            <div className="mt-[18px] border-t border-white/20 light:border-slate-300" />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <CircleNotch className="h-8 w-8 text-zinc-400 animate-spin" />
    </div>
  );
}

function RouterList({ routers, removeRouter, openEditModal }) {
  return (
    <div className="flex flex-col">
      {routers.map((router, idx) => (
        <RouterRow
          key={router.id}
          router={router}
          removeRouter={removeRouter}
          onEdit={() => openEditModal(router)}
          showDivider={idx < routers.length - 1}
        />
      ))}
    </div>
  );
}

function EmptyState({ onCreateClick, t }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-28">
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-base font-semibold leading-6 text-zinc-50 light:text-slate-900">
          {t("model-router.no-routers")}
        </p>
        <p className="text-sm font-medium leading-5 text-zinc-400 light:text-slate-500 max-w-[370px]">
          {t("model-router.empty-description")}
        </p>
      </div>
      <button
        onClick={onCreateClick}
        className="h-ctl-lg inline-flex items-center justify-center gap-2 px-4 rounded-[11px] border border-transparent bg-ml-accent-fill text-ml-on-accent text-[15px] font-semibold whitespace-nowrap shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter] duration-150 hover:brightness-110"
      >
        {t("model-router.new-router-button")}
      </button>
    </div>
  );
}

function RouterRow({ router, removeRouter, onEdit, showDivider }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (
      !window.confirm(t("model-router.delete-confirm", { name: router.name }))
    )
      return;

    const { success, error } = await ModelRouter.delete(router.id);
    if (success) removeRouter(router.id);
    else showToast(t("model-router.toast-delete-failed", { error }), "error");
  };

  const goToRules = () => navigate(paths.settings.modelRouterRules(router.id));

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <>
      <div
        onClick={goToRules}
        className="group grid grid-cols-[2fr_2fr_1fr_1fr_88px] gap-x-4 items-center h-9 px-4 rounded-lg cursor-pointer hover:bg-white/5 light:hover:bg-slate-100 transition-colors"
      >
        <span className="text-sm font-medium leading-5 text-white light:text-slate-900 truncate">
          {router.name}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500 truncate">
          {router.fallback_provider}/{router.fallback_model}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500">
          {router.ruleCount || 0}
        </span>
        <span className="text-sm font-normal leading-5 text-zinc-400 light:text-slate-500">
          {router.workspaceCount || 0}
        </span>
        <div className="flex items-center justify-end gap-[14px]">
          <button
            onClick={handleEditClick}
            aria-label={t("model-router.edit-router.title", {
              name: router.name,
            })}
            className="border-none text-zinc-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-colors"
          >
            <PencilSimple size={16} weight="bold" />
          </button>
          <button
            onClick={handleDelete}
            aria-label={t("model-router.toast-deleted")}
            className="border-none text-zinc-400 light:text-slate-500 hover:text-red-400 light:hover:text-red-500 transition-colors"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>
      {showDivider && (
        <div className="border-t border-white/10 light:border-slate-200" />
      )}
    </>
  );
}
