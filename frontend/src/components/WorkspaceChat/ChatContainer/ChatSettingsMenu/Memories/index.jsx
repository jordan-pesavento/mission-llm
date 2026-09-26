import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import { useMemoriesSidebar, useSourcesSidebar } from "../../ChatSidebar";
import { MENU_ROW } from "../../chatUi";

export default function MemoriesRow({ onClose }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const { toggleSidebar } = useMemoriesSidebar();
  const { closeSidebar } = useSourcesSidebar();
  const [memoryEnabled, setMemoryEnabled] = useState(null);

  const isAdmin = !user || user?.role === "admin";

  useEffect(() => {
    System.keys().then((settings) => {
      setMemoryEnabled(!!settings?.MemoryEnabled);
    });
  }, []);

  function handleClick() {
    closeSidebar();
    toggleSidebar();
    onClose();
  }

  if (memoryEnabled === null) return null;
  if (!isAdmin && !memoryEnabled) return null;

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      className={MENU_ROW}
    >
      <span>{t("chat_window.memories.title")}</span>
    </button>
  );
}
