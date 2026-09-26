import { useEffect, useRef, useState } from "react";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { X } from "@phosphor-icons/react";
import {
  combineLikeSources,
  CitationDetailModal,
} from "../ChatHistory/Citation";
import MobileCitationModal from "./MobileCitationModal";
import SourceItem from "./SourceItem";
import ChatSidebar, { useSourcesSidebar } from "../ChatSidebar";
import { ICON_BTN } from "../chatUi";

// Re-export for backward compat with existing imports
export { useSourcesSidebar } from "../ChatSidebar";

/**
 * The Sources drawer: the answer's sources as numbered cards with the file
 * name, an excerpt and the real retrieval score. Clicking a card opens the
 * full cited passages (the existing citation detail view).
 */
export default function SourcesSidebar({ workspace = null }) {
  const { sources, sidebarOpen, closeSidebar, highlight } = useSourcesSidebar();
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] = useState(null);
  const bodyRef = useRef(null);

  const combined = combineLikeSources(sources ?? []);
  const totalDocs = Array.isArray(workspace?.documents)
    ? workspace.documents.length
    : null;

  // Bring the card a source chip was clicked for into view.
  useEffect(() => {
    if (!sidebarOpen || !highlight || !bodyRef.current) return;
    const card = [
      ...bodyRef.current.querySelectorAll("[data-source-title]"),
    ].find((el) => el.getAttribute("data-source-title") === highlight);
    card?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sidebarOpen, highlight, sources]);

  if (isMobile) {
    return (
      <MobileCitationModal
        sources={sources}
        isOpen={sidebarOpen}
        selectedSource={selectedSource}
        setSelectedSource={setSelectedSource}
        onClose={() => {
          setSelectedSource(null);
          closeSidebar();
        }}
      />
    );
  }

  return (
    <>
      <ChatSidebar isOpen={sidebarOpen}>
        <aside
          aria-label={t("chat_window.sources")}
          className="w-full h-full flex flex-col overflow-hidden"
        >
          <div className="h-topbar shrink-0 flex items-center gap-2.5 pl-5 pr-3 border-b border-ml-line">
            <h3 className="text-[16.5px] font-[650] text-ml-text">
              {t("chat_window.sources")}
            </h3>
            {combined.length > 0 && (
              <span className="font-mono font-medium text-[13.5px] text-ml-text-3 whitespace-nowrap">
                {totalDocs
                  ? t("chat_window.sources_of_docs", {
                      count: combined.length,
                      total: totalDocs,
                    })
                  : t("chat_window.source_total", { count: combined.length })}
              </span>
            )}
            <span className="flex-1" />
            <button
              onClick={closeSidebar}
              type="button"
              aria-label={t("chat_window.close_sources")}
              className={ICON_BTN}
            >
              <X size={20} />
            </button>
          </div>
          <div
            ref={bodyRef}
            className="flex-1 min-h-0 flex flex-col gap-3 p-4 overflow-y-auto"
          >
            {combined.map((source, idx) => (
              <SourceItem
                key={source.title || idx}
                number={idx + 1}
                source={source}
                highlighted={highlight === source.title}
                onClick={() => setSelectedSource(source)}
              />
            ))}
          </div>
        </aside>
      </ChatSidebar>
      {selectedSource && (
        <CitationDetailModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </>
  );
}
