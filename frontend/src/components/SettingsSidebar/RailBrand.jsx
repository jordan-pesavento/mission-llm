import { Link } from "react-router-dom";
import useLogo from "@/hooks/useLogo";
import paths from "@/utils/paths";
import Emblem from "@/media/logo/mission-llm-icon.svg";

/**
 * Brand lockup for the rail's 64px brand band: the emblem plus the
 * letter-spaced MISSION LLM wordmark ("LLM" in the accent text color).
 * When an admin has uploaded a custom logo under Branding, that logo is shown
 * instead so whitelabeling keeps working.
 */
export default function RailBrand() {
  const { logo, isCustomLogo } = useLogo();

  return (
    <Link
      to={paths.home()}
      aria-label="Home"
      className="flex items-center gap-x-[11px] min-w-0 rounded-[8px]"
    >
      {isCustomLogo && logo ? (
        <img
          src={logo}
          alt="Logo"
          className="max-h-[30px] max-w-full object-contain"
        />
      ) : (
        <>
          <img
            src={Emblem}
            alt=""
            aria-hidden="true"
            className="w-[30px] h-[30px] shrink-0"
          />
          <span className="ml-wordmark text-[15.5px] leading-none text-ml-text truncate min-w-0">
            MISSION <b className="font-[650] text-ml-accent-text">LLM</b>
          </span>
        </>
      )}
    </Link>
  );
}
