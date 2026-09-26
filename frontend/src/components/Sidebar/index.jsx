import React, { useEffect, useRef, useState } from "react";
import { List } from "@phosphor-icons/react";
import NewWorkspaceModal, {
  useNewWorkspaceModal,
} from "../Modals/NewWorkspace";
import ActiveWorkspaces from "./ActiveWorkspaces";
import useLogo from "@/hooks/useLogo";
import { RailFootRow } from "../Footer";
import SettingsButton from "../SettingsButton";
import RailBrand from "../SettingsSidebar/RailBrand";
import { useSidebarToggle, ToggleSidebarButton } from "./SidebarToggle";
import SearchBox from "./SearchBox";
import { Tooltip } from "react-tooltip";
import { createPortal } from "react-dom";

/**
 * Ctrl+/ (Cmd+/ on Mac) focuses the rail search, opening the rail first when
 * it is collapsed. Ctrl+K is taken by the API keys shortcut.
 */
function useSearchShortcut({ inputRef, railOpen, openRail }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
      if (e.key !== "/") return;
      e.preventDefault();
      if (!railOpen) {
        openRail();
        // Wait for the rail to open before focusing its search field.
        setTimeout(() => inputRef.current?.focus(), 320);
        return;
      }
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [railOpen]);
}

export default function Sidebar() {
  const sidebarRef = useRef(null);
  const searchInputRef = useRef(null);
  const { showSidebar, setShowSidebar, canToggleSidebar } = useSidebarToggle();
  // Pages without the collapse toggle (workspace settings) always show the rail.
  const railOpen = showSidebar || !canToggleSidebar;
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();

  useSearchShortcut({
    inputRef: searchInputRef,
    railOpen,
    openRail: () => setShowSidebar(true),
  });

  // Keep the collapsed rail's hidden controls out of the tab order.
  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.inert = !railOpen;
  }, [railOpen]);

  // Frame: a flush rail (var(--ml-rail-w) wide, rail surface, hairline on the
  // right) with three zones: brand band (64px, hairline below, aligned with
  // the main pane's top bar), scrolling body, and a foot band (hairline above)
  // with the link icons and the settings gear in one row.
  return (
    <>
      <div
        data-frame="rail"
        data-offcanvas={railOpen ? undefined : ""}
        style={{ width: railOpen ? "var(--ml-rail-w)" : "0px" }}
        className={`relative shrink-0 h-full bg-ml-rail transition-[width] duration-300 ease-ml ${railOpen ? "border-r border-ml-line" : ""}`}
      >
        {canToggleSidebar && (
          <ToggleSidebarButton
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
          />
        )}
        <div className="overflow-hidden h-full">
          <nav
            ref={sidebarRef}
            aria-label="Workspaces"
            aria-hidden={!railOpen}
            className={`h-full flex flex-col transition-opacity duration-300 ${railOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            style={{ width: "var(--ml-rail-w)" }}
          >
            <div
              data-frame="rail-head"
              className={`h-topbar shrink-0 flex items-center pl-[18px] ${canToggleSidebar ? "pr-[62px]" : "pr-3"} border-b border-ml-line`}
            >
              <RailBrand />
            </div>
            <div
              data-frame="rail-body"
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-[14px] flex flex-col gap-y-[6px]"
            >
              <SearchBox inputRef={searchInputRef} />
              <ActiveWorkspaces showNewWsModal={showNewWsModal} />
            </div>
            <div
              data-frame="rail-foot"
              className="shrink-0 border-t border-ml-line px-[14px] py-3"
            >
              <RailFootRow>
                <SettingsButton />
              </RailFootRow>
            </div>
          </nav>
        </div>
        {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
      </div>
      <WorkspaceAndThreadTooltips />
    </>
  );
}

export function SidebarMobileHeader() {
  const { logo } = useLogo();
  const sidebarRef = useRef(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBgOverlay, setShowBgOverlay] = useState(false);
  const {
    showing: showingNewWsModal,
    showModal: showNewWsModal,
    hideModal: hideNewWsModal,
  } = useNewWorkspaceModal();

  useEffect(() => {
    // Darkens the rest of the screen
    // when sidebar is open.
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

  return (
    <>
      <div
        aria-label="Show sidebar"
        className="fixed top-0 left-0 right-0 z-10 flex justify-between items-center px-4 py-2 bg-ml-rail border-b border-ml-line text-ml-text h-16"
      >
        <button
          onClick={() => setShowSidebar(true)}
          aria-label="Open sidebar"
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
          aria-label="Workspaces"
          className="relative h-[100dvh] flex flex-col bg-ml-rail border-r border-ml-line w-[min(320px,86vw)]"
        >
          <div className="h-topbar shrink-0 flex items-center pl-[18px] pr-3 border-b border-ml-line">
            <RailBrand />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-[14px] flex flex-col gap-y-[6px]">
            <SearchBox />
            <ActiveWorkspaces showNewWsModal={showNewWsModal} />
          </div>
          <div className="shrink-0 border-t border-ml-line px-[14px] py-3">
            <RailFootRow>
              <SettingsButton />
            </RailFootRow>
          </div>
        </nav>
        {showingNewWsModal && <NewWorkspaceModal hideModal={hideNewWsModal} />}
      </div>
    </>
  );
}

function WorkspaceAndThreadTooltips() {
  return createPortal(
    <React.Fragment>
      <Tooltip
        id="workspace-name"
        place="right"
        delayShow={800}
        className="tooltip !text-xs z-99"
      />
      <Tooltip
        id="workspace-thread-name"
        place="right"
        delayShow={800}
        className="tooltip !text-xs z-99"
      />
      <Tooltip
        id="upload-workspace"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
      <Tooltip
        id="gear-workspace"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </React.Fragment>,
    document.body
  );
}
