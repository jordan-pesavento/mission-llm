import { X } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import ChatSidebar from "../ChatSidebar";
import { MemoriesProvider, useMemoriesContext } from "./MemoriesContext";
import PersonalizationToggle from "./PersonalizationToggle";
import MemoryTabs from "./MemoryTabs";
import MemoryCard from "./MemoryCard";
import MemoryModal from "./MemoryModal";

export { useMemoriesSidebar } from "../ChatSidebar";

export default function MemoriesSidebar({ workspace }) {
  return (
    <MemoriesProvider workspace={workspace}>
      <MemoriesSidebarContent />
    </MemoriesProvider>
  );
}

function MemoriesSidebarContent() {
  const { sidebarOpen, canToggle, enabled } = useMemoriesContext();

  if (!canToggle && !enabled) return null;
  return (
    <>
      <ChatSidebar isOpen={sidebarOpen}>
        <SidebarPanel>
          <SidebarHeader />
          <PersonalizationToggle />
          <MemoryList />
        </SidebarPanel>
      </ChatSidebar>
      <MemoryModalWrapper />
    </>
  );
}

function SidebarPanel({ children }) {
  return (
    <div className="w-full h-full flex flex-col gap-5 px-5 pb-5 overflow-y-auto">
      {children}
    </div>
  );
}

function MemoryList() {
  const { enabled, activeMemories } = useMemoriesContext();

  if (!enabled) return null;
  if (activeMemories.length === 0) {
    return (
      <>
        <MemoryTabs />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <MemoryTabs />
      <div className="flex flex-col gap-1.5 pb-4">
        {activeMemories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </>
  );
}

function MemoryModalWrapper() {
  const {
    enabled,
    modalState,
    editingMemory,
    closeModal,
    handleCreate,
    handleUpdate,
  } = useMemoriesContext();

  if (!enabled) return null;
  return (
    <MemoryModal
      isOpen={modalState.open}
      mode={modalState.mode}
      initialContent={editingMemory?.content || ""}
      onClose={closeModal}
      onSubmit={(content) => {
        if (modalState.mode === "edit" && editingMemory) {
          handleUpdate(editingMemory.id, content);
        } else {
          handleCreate(content);
        }
      }}
    />
  );
}

function SidebarHeader() {
  const { t } = useTranslation();
  const { closeSidebar } = useMemoriesContext();

  return (
    <div className="h-topbar -mx-5 pl-5 pr-3 flex items-center justify-between gap-x-2.5 shrink-0 border-b border-theme-sidebar-border">
      <p className="font-semibold text-base leading-6 text-theme-text-primary">
        {t("chat_window.memories.title")}
      </p>
      <button
        onClick={closeSidebar}
        type="button"
        aria-label="Close"
        className="w-ctl h-ctl grid place-items-center rounded-[10px] text-theme-text-secondary hover:text-theme-text-primary hover:bg-ml-raised transition-colors border-none bg-transparent cursor-pointer"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  const { openCreateModal } = useMemoriesContext();
  return (
    <p className="text-sm leading-5 text-zinc-400 light:text-slate-600 text-center">
      {t("chat_window.memories.empty")}{" "}
      <button
        type="button"
        onClick={openCreateModal}
        className="text-zinc-50 light:text-slate-900 underline border-none bg-transparent cursor-pointer p-0 text-sm leading-5 font-normal"
      >
        {t("chat_window.memories.empty_cta")}
      </button>
    </p>
  );
}
