import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  GearSix,
  Robot,
  UploadSimple,
} from "@phosphor-icons/react";
import useUser from "@/hooks/useUser";
import { COMPOSER_CHIP, DeltaMark } from "../chatUi";

/**
 * Empty workspace chat and home: the assistant mark, the greeting, the quick
 * actions and the workspace's suggested messages, centered above the docked
 * composer. Same actions and role rules as the previous QuickActions and
 * SuggestedMessages components.
 */
export default function EmptyChatState({
  workspace = null,
  hasAvailableWorkspace = !!workspace,
  sendCommand,
  onCreateAgent,
  onEditWorkspace,
  onUploadDocument,
}) {
  const { t } = useTranslation();
  const { user } = useUser();

  const actions = [
    {
      key: "agent",
      label: t("main-page.quickActions.createAgent"),
      Icon: Robot,
      onClick: onCreateAgent,
      show: !user || ["admin"].includes(user?.role),
    },
    {
      key: "edit",
      label: t("main-page.quickActions.editWorkspace"),
      Icon: GearSix,
      onClick: onEditWorkspace,
      show:
        hasAvailableWorkspace &&
        (!user || ["admin", "manager"].includes(user?.role)),
    },
    {
      key: "upload",
      label: t("main-page.quickActions.uploadDocument"),
      Icon: UploadSimple,
      onClick: onUploadDocument,
      // Any user can upload documents.
      show: true,
    },
  ].filter((action) => action.show);

  const suggestions = (workspace?.suggestedMessages ?? [])
    .map((msg) =>
      msg.heading?.trim()
        ? `${msg.heading.trim()} ${msg.message?.trim() || ""}`.trim()
        : msg.message?.trim() || ""
    )
    .filter(Boolean);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-gutter py-8 flex">
      <div className="m-auto w-full flex flex-col items-center text-center">
        <div
          aria-hidden="true"
          className="w-14 h-14 grid place-items-center rounded-[16px] border border-[rgba(169,186,214,0.38)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),var(--ml-shadow)] bg-[linear-gradient(180deg,#173063,#070F26)]"
        >
          <DeltaMark className="w-8 h-8 text-[#DDE6F6]" />
        </div>
        <h1 className="mt-6 font-display [font-stretch:112%] font-[650] text-[30px] leading-tight tracking-[0.01em] text-ml-text">
          {t("main-page.greeting")}
        </h1>
        {actions.length > 0 && (
          <div
            data-row="empty-actions"
            className="mt-7 flex flex-wrap justify-center gap-2"
          >
            {actions.map(({ key, label, Icon, onClick }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                className={`${COMPOSER_CHIP} border-ml-line-2 bg-ml-panel`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        )}
        {/* Suggested prompts as tiles that share the width, centered under
            the actions: short prompts never stretch into long empty rows. */}
        {suggestions.length > 0 && (
          <ul
            data-row="empty-suggestions"
            className="mt-8 w-full flex flex-wrap justify-center gap-3 text-left"
          >
            {suggestions.map((text, index) => (
              <li key={index} className="flex w-[300px] max-w-full">
                <button
                  type="button"
                  onClick={() => sendCommand({ text, autoSubmit: true })}
                  className="group flex-1 min-h-[96px] flex flex-col justify-between gap-3 p-4 rounded-[14px] border border-ml-line-2 bg-ml-panel text-left text-[15.5px] leading-snug text-ml-text-2 cursor-pointer transition-colors duration-150 hover:border-ml-accent-line hover:bg-ml-raised hover:text-ml-text"
                >
                  <span className="line-clamp-3 [text-wrap:pretty]">
                    {text}
                  </span>
                  <ArrowUpRight
                    size={16}
                    aria-hidden="true"
                    className="self-end shrink-0 text-ml-text-3 transition-colors duration-150 group-hover:text-ml-accent-text"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
