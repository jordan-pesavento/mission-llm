import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import useUser from "@/hooks/useUser";
import AgentSkillsTab from "./Tabs/AgentSkills";
import SlashCommandsTab from "./Tabs/SlashCommands";

export const TOOLS_MENU_KEYBOARD_EVENT = "tools-menu-keyboard";
function getTabs(t, user) {
  const tabs = [
    {
      key: "slash-commands",
      label: t("chat_window.slash_commands"),
      component: SlashCommandsTab,
    },
  ];

  // Only show agent skills tab for admins or when multiuser mode is off
  const canSeeAgentSkills =
    !user?.hasOwnProperty("role") || user.role === "admin";
  if (canSeeAgentSkills) {
    tabs.push({
      key: "agent-skills",
      label: t("chat_window.agent_skills"),
      component: AgentSkillsTab,
    });
  }

  return tabs;
}

/**
 * @param {Workspace} props.workspace - the workspace object
 * @param {boolean} props.showing
 * @param {function} props.setShowing
 * @param {function} props.sendCommand
 * @param {object} props.promptRef
 * @param {boolean} [props.centered] - when true, popup opens below the input
 */
export default function ToolsMenu({
  workspace,
  showing,
  setShowing,
  sendCommand,
  promptRef,
  centered = false,
  highlightedIndexRef,
}) {
  const { t } = useTranslation();
  const { user } = useUser();
  const TABS = useMemo(() => getTabs(t, user), [t, user]);
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [maxHeight, setMaxHeight] = useState(360);
  const itemCountRef = useRef(0);
  const popoverRef = useRef(null);

  // Always open to the slash commands
  useEffect(() => {
    if (showing) setActiveTab(TABS[0].key);
  }, [showing]);

  // Reset highlight when switching tabs or closing
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [activeTab, showing]);

  // Constrain popover height to the space available in the viewport so it
  // never overflows off-screen on shorter windows (e.g. centered home view).
  useLayoutEffect(() => {
    if (!showing) return;
    const update = () => {
      const el = popoverRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const available = centered
        ? window.innerHeight - rect.top - 16
        : rect.bottom - 16;
      setMaxHeight(Math.max(0, Math.min(360, available)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [showing, centered]);

  // Keep the parent ref in sync so PromptInput can check it on Enter
  useEffect(() => {
    if (highlightedIndexRef) highlightedIndexRef.current = highlightedIndex;
  }, [highlightedIndex]);

  const registerItemCount = useCallback((count) => {
    itemCountRef.current = count;
  }, []);

  useEffect(() => {
    if (!showing) return;

    function handleKeyboard(e) {
      const { key } = e.detail;

      if (key === "ArrowLeft" || key === "ArrowRight") {
        const currentIdx = TABS.findIndex((tab) => tab.key === activeTab);
        const nextIdx =
          key === "ArrowLeft"
            ? (currentIdx - 1 + TABS.length) % TABS.length
            : (currentIdx + 1) % TABS.length;
        setActiveTab(TABS[nextIdx].key);
        return;
      }

      if (key === "ArrowUp" || key === "ArrowDown") {
        const count = itemCountRef.current;
        if (count === 0) return;
        setHighlightedIndex((prev) => {
          if (key === "ArrowDown") {
            return prev < count - 1 ? prev + 1 : 0;
          }
          return prev > 0 ? prev - 1 : count - 1;
        });
        return;
      }

      // Enter is handled by the tab components via highlightedIndex
    }

    window.addEventListener(TOOLS_MENU_KEYBOARD_EVENT, handleKeyboard);
    return () =>
      window.removeEventListener(TOOLS_MENU_KEYBOARD_EVENT, handleKeyboard);
  }, [showing, activeTab]);

  if (!showing) return null;

  const { component: ActiveTab } = TABS.find((tab) => tab.key === activeTab);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShowing(false)}
      />
      <div
        ref={popoverRef}
        onMouseDown={(e) => {
          // Prevents prompt textarea from losing focus when clicking inside the menu.
          // Skip for portaled modals so their inputs can still receive focus.
          if (e.currentTarget.contains(e.target)) e.preventDefault();
        }}
        style={{ maxHeight }}
        className={`absolute left-0 right-0 md:right-auto md:w-[440px] z-50 bg-ml-raised border border-ml-line-2 rounded-[14px] shadow-ml-pop p-2.5 flex flex-col gap-2 overflow-hidden ${
          centered ? "top-full mt-2" : "bottom-full mb-2"
        }`}
      >
        <div role="tablist" className="flex shrink-0 gap-1 items-center">
          {TABS.map((tab) => (
            <TabButton
              key={tab.key}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        <div className="flex flex-col gap-1 overflow-y-auto no-scroll min-h-0">
          <ActiveTab
            sendCommand={sendCommand}
            setShowing={setShowing}
            promptRef={promptRef}
            highlightedIndex={highlightedIndex}
            registerItemCount={registerItemCount}
            workspace={workspace}
          />
        </div>
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-8 px-3 rounded-[8px] border-none cursor-pointer text-[13.5px] font-semibold text-center whitespace-nowrap transition-colors duration-150 ${
        active
          ? "bg-ml-accent-soft text-ml-text"
          : "text-ml-text-2 hover:bg-ml-raised-2 hover:text-ml-text"
      }`}
    >
      {children}
    </button>
  );
}
