import { useState, useRef, useEffect } from "react";
import { DotsThree } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import TextSizeRow from "./TextSize";
import MemoriesRow from "./Memories";
import CopyLinkToChatRow from "./CopyLinkToChat";
import ExportRow from "./Export";
import { MENU_SURFACE } from "../chatUi";

/**
 * The "more" button at the right end of the chat top bar. Opens the chat
 * settings menu: text size, memories, export and copy chat link.
 */
export default function ChatSettingsMenu({
  history = [],
  workspace = null,
  threadSlug = null,
}) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setShowMenu(false);
      }
    }
    function handleEscape(e) {
      if (e.key === "Escape") setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label={t("chat_window.more_actions")}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        data-tooltip-id="chat-settings-menu"
        data-tooltip-hidden={showMenu}
        data-tooltip-content={t("chat_window.more_actions")}
        className={`w-ctl h-ctl grid place-items-center rounded-[10px] border cursor-pointer transition-colors duration-150 ${
          showMenu
            ? "border-ml-accent-line bg-ml-accent-soft text-ml-text"
            : "border-ml-line-2 bg-ml-panel text-ml-text-2 hover:text-ml-text hover:border-ml-accent-line"
        }`}
      >
        <DotsThree size={20} weight="bold" />
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          role="menu"
          className={`absolute right-0 top-[calc(100%+8px)] z-50 w-[240px] p-1.5 flex flex-col gap-0.5 ${MENU_SURFACE}`}
        >
          <TextSizeRow />
          <MemoriesRow onClose={() => setShowMenu(false)} />
          <ExportRow
            history={history}
            workspace={workspace}
            threadSlug={threadSlug}
            onClose={() => setShowMenu(false)}
          />
          <CopyLinkToChatRow />
        </div>
      )}
    </div>
  );
}
