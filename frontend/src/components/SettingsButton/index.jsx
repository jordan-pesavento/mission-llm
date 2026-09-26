import useUser from "@/hooks/useUser";
import paths from "@/utils/paths";
import { ArrowLeft, GearSix } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useMatch } from "react-router-dom";
import { Tooltip } from "react-tooltip";

const ICON_BUTTON =
  "w-ctl h-ctl shrink-0 grid place-items-center rounded-[10px] border border-transparent text-ml-text-2 hover:text-ml-text hover:bg-ml-raised hover:border-ml-line transition-colors duration-150";

/**
 * The settings gear at the end of the rail's user row. Inside settings it
 * turns into a way back to the workspaces.
 */
export default function SettingsButton() {
  const isInSettings = !!useMatch("/settings/*");
  const { user } = useUser();

  if (user && user?.role === "default") return null;

  if (isInSettings)
    return (
      <>
        <Link
          to={paths.home()}
          className={ICON_BUTTON}
          aria-label="Back to workspaces"
          data-tooltip-id="settings-button"
          data-tooltip-content="Back to workspaces"
        >
          <ArrowLeft size={20} />
        </Link>
        <Tooltip
          id="settings-button"
          place="top"
          delayShow={300}
          className="tooltip !text-xs z-99"
        />
      </>
    );

  return (
    <>
      <Link
        to={paths.settings.interface()}
        className={ICON_BUTTON}
        aria-label="Settings"
        data-tooltip-id="settings-button"
        data-tooltip-content="Open settings"
      >
        <GearSix size={20} />
      </Link>
      <Tooltip
        id="settings-button"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </>
  );
}

/** Full-width "Back to workspaces" button for the settings rail foot. */
export function BackToWorkspacesButton() {
  return (
    <Link
      to={paths.home()}
      className="w-full h-[42px] shrink-0 inline-flex items-center justify-center gap-x-2 px-4 rounded-[12px] border border-ml-line-2 bg-ml-raised text-ml-text text-[15px] font-semibold whitespace-nowrap hover:border-ml-accent-line transition-colors duration-150"
    >
      <ArrowLeft size={18} />
      Back to workspaces
    </Link>
  );
}
