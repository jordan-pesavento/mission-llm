import React, { useState, useEffect, useRef } from "react";
import { Trash, DotsThree, TreeView } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { ACT_BTN, MENU_ROW, MENU_SURFACE } from "../../../../chatUi";

function ActionMenu({ chatId, forkThread, isEditing, role }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => setOpen(!open);

  const handleFork = () => {
    forkThread(chatId);
    setOpen(false);
  };

  const handleDelete = () => {
    window.dispatchEvent(
      new CustomEvent("delete-message", { detail: { chatId } })
    );
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!chatId || isEditing || role === "user") return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className={`${ACT_BTN} ${open ? "!bg-ml-raised !text-ml-text !border-ml-line" : ""}`}
        data-tooltip-id="action-menu"
        data-tooltip-content={t("chat_window.more_actions")}
        aria-label={t("chat_window.more_actions")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <DotsThree size={20} weight="bold" />
      </button>
      {open && (
        <div
          data-action-menu-open
          role="menu"
          className={`absolute left-0 bottom-[calc(100%+6px)] z-50 w-[180px] p-1.5 flex flex-col gap-0.5 ${MENU_SURFACE}`}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleFork}
            className={MENU_ROW}
          >
            <TreeView size={18} />
            <span>{t("chat_window.fork")}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className={`${MENU_ROW} hover:!bg-ml-bad-soft`}
          >
            <Trash size={18} className="text-ml-bad" />
            <span>{t("chat_window.delete")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
