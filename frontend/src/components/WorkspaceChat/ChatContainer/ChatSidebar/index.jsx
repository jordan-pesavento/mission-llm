import { createContext, useContext, useState } from "react";

const ChatSidebarContext = createContext();

export function ChatSidebarProvider({ children }) {
  const [activeSidebar, setActiveSidebar] = useState(null);
  const [sidebarData, setSidebarData] = useState(null);
  // Title of the source a chip was clicked for, so the drawer can mark and
  // scroll to the matching card. Null when the drawer opened from elsewhere.
  const [highlight, setHighlight] = useState(null);

  function openSidebar(type, data = null, highlightTitle = null) {
    setActiveSidebar(type);
    setSidebarData(data);
    setHighlight(highlightTitle);
  }

  function closeSidebar() {
    setActiveSidebar(null);
    setSidebarData(null);
    setHighlight(null);
  }

  function toggleSidebar(type, data = null) {
    if (activeSidebar === type) closeSidebar();
    else openSidebar(type, data);
  }

  return (
    <ChatSidebarContext.Provider
      value={{
        activeSidebar,
        sidebarData,
        highlight,
        openSidebar,
        closeSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </ChatSidebarContext.Provider>
  );
}

export function useChatSidebar() {
  return useContext(ChatSidebarContext);
}

export function useSourcesSidebar() {
  const { activeSidebar, sidebarData, highlight, openSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "sources",
    sources: activeSidebar === "sources" ? sidebarData : [],
    highlight: activeSidebar === "sources" ? highlight : null,
    openSidebar: (sources, highlightTitle = null) =>
      openSidebar("sources", sources, highlightTitle),
    closeSidebar,
  };
}

export function useMemoriesSidebar() {
  const { activeSidebar, toggleSidebar, closeSidebar } =
    useContext(ChatSidebarContext);
  return {
    sidebarOpen: activeSidebar === "memories",
    toggleSidebar: () => toggleSidebar("memories"),
    closeSidebar,
  };
}

/**
 * Reusable animation wrapper for right-side chat panels (the drawer pane of
 * the frame). It sits flush against the main pane, separated by a hairline,
 * on the rail surface, and is var(--ml-drawer-w) wide when open.
 * Uses a fixed-width wrapper + GPU-composited translateX so opening/closing
 * never triggers layout recalculation on the chat history (which can have
 * 500+ message nodes).
 * Below 1240px there is no room for a third pane next to the thread, so the
 * drawer overlays the right edge of the main pane instead of squeezing it.
 */
export default function ChatSidebar({ isOpen, children }) {
  return (
    <div
      data-frame="drawer"
      data-offcanvas={isOpen ? undefined : ""}
      className={`h-full flex-shrink-0 overflow-hidden bg-theme-bg-sidebar max-[1240px]:absolute max-[1240px]:top-0 max-[1240px]:right-0 max-[1240px]:z-40 ${isOpen ? "border-l border-theme-sidebar-border max-[1240px]:shadow-ml-pop" : ""}`}
      style={{
        width: isOpen ? "var(--ml-drawer-w)" : "0px",
        transition: "width 400ms cubic-bezier(0.4,0,0.2,1)",
        willChange: isOpen ? "width" : "auto",
        contain: "strict",
      }}
    >
      <div
        className="h-full"
        style={{
          width: "var(--ml-drawer-w)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 400ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
