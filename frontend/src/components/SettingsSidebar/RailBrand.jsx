import { Link } from "react-router-dom";
import useLogo from "@/hooks/useLogo";
import useBranding from "@/hooks/useBranding";
import { useTheme } from "@/hooks/useTheme";
import paths from "@/utils/paths";
import Emblem from "@/media/logo/mission-llm-icon.svg";
import FitWordmark, {
  wordmarkParts,
  wordmarkWraps,
} from "@/components/BrandWordmark";

/**
 * Brand lockup for the rail's 64px brand band: the emblem plus the
 * letter-spaced product name wordmark in capitals, with the last word in the
 * accent text color (MISSION LLM by default). When an admin has uploaded a
 * logo under Branding, the logo for the current theme is shown instead.
 */
export default function RailBrand() {
  const { logo, isCustomLogo } = useLogo();
  const { brand } = useBranding();
  const { isLight } = useTheme();
  const [lead, last] = wordmarkParts(brand.appName);
  // A longer multi-word name wraps onto a second line, shrinking to fit if it
  // must, and never loses its accent word (FitWordmark). MISSION LLM and
  // other short names stay on one line.
  const wraps = wordmarkWraps(brand.appName);
  // Size of the logo shown for this theme (an inherited entry carries the
  // other theme's size), so the image has a known aspect ratio.
  const logoSize = isLight ? brand.assets.logoLight : brand.assets.logoDark;
  const custom = isCustomLogo && logo;

  return (
    <Link
      to={paths.home()}
      aria-label="Home"
      className={`flex items-center gap-x-[11px] min-w-0 rounded-[8px] ${wraps && !custom ? "flex-1" : ""}`}
    >
      {custom ? (
        // A definite height with automatic width: an SVG that has only a
        // viewBox has no natural width, and a max-height alone collapses it
        // to 0x0 inside this shrink-to-fit link.
        <img
          src={logo}
          alt={brand.appName}
          width={logoSize?.width || undefined}
          height={logoSize?.height || undefined}
          className="block h-[30px] w-auto max-w-full object-contain object-left"
        />
      ) : (
        <>
          <img
            src={Emblem}
            alt=""
            aria-hidden="true"
            className="w-[30px] h-[30px] shrink-0"
          />
          {wraps ? (
            <FitWordmark
              name={brand.appName}
              className="ml-wordmark flex-1 text-[15.5px] leading-[1.2] text-ml-text"
              accentClassName="font-[650] text-ml-accent-text"
            />
          ) : (
            <span className="ml-wordmark text-[15.5px] text-ml-text min-w-0 leading-none truncate">
              {lead && `${lead} `}
              <b className="font-[650] text-ml-accent-text">{last}</b>
            </span>
          )}
        </>
      )}
    </Link>
  );
}
