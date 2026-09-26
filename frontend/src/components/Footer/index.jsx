import System from "@/models/system";
import useBranding from "@/hooks/useBranding";
import paths from "@/utils/paths";
import {
  BookOpen,
  DiscordLogo,
  GithubLogo,
  Briefcase,
  Envelope,
  Globe,
  HouseLine,
  Info,
  LinkSimple,
} from "@phosphor-icons/react";
import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";

export const MAX_ICONS = 3;
export const ICON_COMPONENTS = {
  BookOpen: BookOpen,
  DiscordLogo: DiscordLogo,
  GithubLogo: GithubLogo,
  Envelope: Envelope,
  LinkSimple: LinkSimple,
  HouseLine: HouseLine,
  Globe: Globe,
  Briefcase: Briefcase,
  Info: Info,
};

// Quiet icon button, the same size as the settings gear and back button
// that share the rail foot row with it.
export const RAIL_ICON_LINK =
  "w-ctl h-ctl shrink-0 grid place-items-center rounded-[10px] border border-transparent text-ml-text-2 hover:text-ml-text hover:bg-ml-raised hover:border-ml-line transition-colors duration-150";

/**
 * The rail foot: one row with the footer link icons on the left and the
 * settings gear (in settings: the back button) at the right end.
 */
export function RailFootRow({ children = null }) {
  return (
    <div data-row="rail-foot" className="flex items-center gap-x-1 min-h-ctl">
      <Footer />
      <div className="ml-auto flex items-center gap-x-1">{children}</div>
    </div>
  );
}

/**
 * The footer link icons (source code and docs by default, or the custom
 * footer icons an admin configured under Branding).
 */
export default function Footer() {
  const [footerData, setFooterData] = useState(false);
  // The saved brand version changes whenever Branding is saved (here, in
  // another tab, or by another admin), so the links refetch right away.
  const { savedBrand } = useBranding();
  const brandVersion = savedBrand?.version || null;

  useEffect(() => {
    let active = true;
    System.fetchCustomFooterIcons(brandVersion).then(({ footerData }) => {
      if (active) setFooterData(footerData);
    });
    return () => {
      active = false;
    };
  }, [brandVersion]);

  // wait for some kind of non-false response from footer data first
  // to prevent pop-in.
  if (footerData === false) return null;

  const links =
    !Array.isArray(footerData) || footerData.length === 0
      ? [
          {
            url: paths.sourceCode(),
            Icon: GithubLogo,
            label: "View Source Code",
            ariaLabel: "View source code on GitHub",
          },
          {
            url: paths.docs(),
            Icon: BookOpen,
            label: "Open Mission LLM help docs",
            ariaLabel: "Docs",
          },
        ]
      : footerData.map((item) => ({
          url: item.url,
          Icon: ICON_COMPONENTS?.[item.icon] ?? ICON_COMPONENTS.Info,
          label: item.url,
          ariaLabel: item.url,
        }));

  return (
    <div
      className="flex items-center gap-x-0.5 shrink-0"
      aria-label="Links"
      role="group"
    >
      {links.map(({ url, Icon, label, ariaLabel }, index) => (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noreferrer"
          className={RAIL_ICON_LINK}
          aria-label={ariaLabel}
          data-tooltip-id="footer-item"
          data-tooltip-content={label}
        >
          <Icon size={18} weight="regular" />
        </a>
      ))}
      <Tooltip
        id="footer-item"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
      />
    </div>
  );
}
