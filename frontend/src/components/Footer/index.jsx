import System from "@/models/system";
import paths from "@/utils/paths";
import {
  BookOpen,
  DiscordLogo,
  GithubLogo,
  GitlabLogo,
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

// Quiet 30px icon button, the same size as the rail's small "+" button.
export const RAIL_ICON_LINK =
  "w-[30px] h-[30px] shrink-0 grid place-items-center rounded-[8px] border border-transparent text-ml-text-3 hover:text-ml-text hover:bg-ml-raised hover:border-ml-line transition-colors duration-150";

/**
 * Quiet row that closes the rail body, just above the foot hairline (pushed
 * down with mt-auto when the list is short, after the list when it scrolls).
 */
export function RailLinks({ className = "" }) {
  return (
    <div className={`mt-auto pt-3 flex items-center shrink-0 ${className}`}>
      <Footer />
    </div>
  );
}

/**
 * The footer link icons (source code and docs by default, or the custom
 * footer icons an admin configured under Branding). They close the rail body
 * so they stay one click away without crowding the user row.
 */
export default function Footer() {
  const [footerData, setFooterData] = useState(false);

  useEffect(() => {
    async function fetchFooterData() {
      const { footerData } = await System.fetchCustomFooterIcons();
      setFooterData(footerData);
    }
    fetchFooterData();
  }, []);

  // wait for some kind of non-false response from footer data first
  // to prevent pop-in.
  if (footerData === false) return null;

  const links =
    !Array.isArray(footerData) || footerData.length === 0
      ? [
          {
            url: paths.sourceCode(),
            Icon: GitlabLogo,
            label: "View Source Code",
            ariaLabel: "View source code on GitLab",
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
