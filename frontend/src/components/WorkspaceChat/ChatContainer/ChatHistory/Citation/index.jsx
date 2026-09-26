import { Fragment, useState, useEffect } from "react";
import { decode as HTMLDecode } from "he";
import truncate from "truncate";
import Modal, { ModalHeader, ModalBody } from "@/components/lib/Modal";
import {
  FileText,
  Info,
  ArrowSquareOut,
  GithubLogo,
  YoutubeLogo,
  LinkSimple,
  GitlabLogo,
  GitBranch,
} from "@phosphor-icons/react";
import GmailLogo from "@/pages/Admin/Agents/GMailSkillPanel/gmail.png";
import GoogleCalendarLogo from "@/pages/Admin/Agents/GoogleCalendarSkillPanel/google-calendar.png";
import OutlookLogo from "@/pages/Admin/Agents/OutlookSkillPanel/outlook.png";
import { toPercentString } from "@/utils/numbers";
import { useTranslation } from "react-i18next";
import { useSourcesSidebar } from "../../ChatSidebar";
import { NumberBadge } from "../../chatUi";

const CIRCLE_ICONS = {
  file: FileText,
  link: LinkSimple,
  youtube: YoutubeLogo,
  github: GithubLogo,
  gitlab: GitlabLogo,
  gitea: GitBranch,
  confluence: LinkSimple,
  drupalwiki: FileText,
  obsidian: FileText,
  paperlessNgx: FileText,
};

const CIRCLE_IMAGES = {
  gmailThread: GmailLogo,
  gmailAttachment: GmailLogo,
  googleCalendar: GoogleCalendarLogo,
  outlookThread: OutlookLogo,
  outlookAttachment: OutlookLogo,
};

/**
 * Returns the custom image for a given type, or null if no custom image is available.
 * @param {string} type
 * @returns {string|null}
 */
export function getCustomImage(type) {
  return CIRCLE_IMAGES[type] ?? null;
}

/**
 * Renders a circle with a source type icon inside, or a favicon if URL is provided.
 * @param {"file"|"link"|"youtube"|"github"|"gitlab"|"gitea"|"confluence"|"drupalwiki"|"obsidian"|"paperlessNgx"} props.type
 * @param {number} [props.size] - Circle diameter in px
 * @param {number} [props.iconSize] - Icon size in px
 * @param {string} [props.url] - Optional URL to fetch favicon from
 * @param {string} [props.customImage] - Optional custom image to display
 */
export function SourceTypeCircle({
  type = "file",
  size = 22,
  iconSize = 12,
  url = null,
  customImage = null,
}) {
  const Icon = CIRCLE_ICONS[type] || CIRCLE_ICONS.file;
  const [imgError, setImgError] = useState(false);

  let faviconUrl = null;
  if (type === "link" && url) {
    try {
      const hostname = new URL(url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    } catch {
      faviconUrl = null;
    }
  }

  useEffect(() => {
    setImgError(false);
  }, [url]);

  return (
    <div
      className={`${customImage ? "bg-transparent border-none" : "bg-white light:bg-slate-100 border-zinc-800 light:border-white rounded-full"} flex items-center justify-center overflow-hidden`}
      style={{ width: size, height: size }}
    >
      {faviconUrl && !imgError ? (
        <img
          src={faviconUrl}
          alt="favicon"
          style={{ width: size, height: size }}
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : customImage ? (
        <img
          src={customImage}
          alt={type}
          style={{ width: size, height: size }}
          className="object-contain bg-transparent"
        />
      ) : (
        <Icon size={iconSize} weight="bold" className="text-black" />
      )}
    </div>
  );
}

export function combineLikeSources(sources) {
  const combined = {};
  sources.forEach((source) => {
    const { id, title, text, chunkSource = "", score = null } = source;
    if (combined.hasOwnProperty(title)) {
      combined[title].chunks.push({ id, text, chunkSource, score });
      combined[title].references += 1;
    } else {
      combined[title] = {
        title,
        chunks: [{ id, text, chunkSource, score }],
        references: 1,
      };
    }
  });
  return Object.values(combined);
}

/**
 * Short monospace location for a source chip or card: the host for web
 * sources. Files carry no page or section data, so they show none.
 * @param {{isUrl: boolean, href: string}} info - from parseChunkSource
 * @returns {string}
 */
export function sourceLocation(info) {
  if (!info?.isUrl || !info?.href) return "";
  try {
    return new URL(info.href).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Numbered source chips under an answer (number, filename, location). A chip
 * opens the Sources drawer on this answer's sources with that card marked;
 * clicking the marked chip again closes the drawer.
 */
export default function Citations({ sources = [] }) {
  const {
    sidebarOpen,
    openSidebar,
    closeSidebar,
    sources: currentSources,
    highlight,
  } = useSourcesSidebar();
  const { t } = useTranslation();
  if (sources.length === 0) return null;

  const combined = combineLikeSources(sources);
  const isCurrent = sidebarOpen && sources === currentSources;

  function handleChip(title) {
    if (isCurrent && highlight === title) closeSidebar();
    else openSidebar(sources, title);
  }

  return (
    <div
      role="group"
      aria-label={t("chat_window.sources")}
      className="flex flex-wrap gap-2 mt-[18px]"
    >
      {combined.map((source, idx) => {
        const info = parseChunkSource(source);
        const location = sourceLocation(info);
        const active = isCurrent && highlight === source.title;
        return (
          <button
            key={source.title || idx}
            type="button"
            onClick={() => handleChip(source.title)}
            aria-pressed={active}
            title={source.title}
            className={`h-ctl-lg max-w-full min-w-0 inline-flex items-center gap-2.5 pl-[7px] pr-3 rounded-[11px] border bg-ml-panel text-[14.5px] font-medium leading-none text-ml-text cursor-pointer transition-colors duration-150 ${
              active
                ? "border-ml-accent-line"
                : "border-ml-line-2 hover:border-ml-accent-line"
            }`}
          >
            <NumberBadge>{idx + 1}</NumberBadge>
            <span className="truncate min-w-0">{source.title}</span>
            {location && (
              <span className="shrink-0 font-mono text-[13.5px] text-ml-text-3">
                {location}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function omitChunkHeader(text) {
  if (!text.includes("<document_metadata>")) return text;
  return text.split("</document_metadata>")[1].trim();
}

export function CitationDetailModal({ source, onClose }) {
  const { references, title, chunks } = source;
  const { isUrl, text: webpageUrl, href: linkTo } = parseChunkSource(source);
  const { t } = useTranslation();

  return (
    <Modal isOpen={!!source} onClose={onClose} size="lg">
      <ModalHeader
        title={
          isUrl ? (
            <a
              href={linkTo}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-x-1 max-w-full overflow-hidden hover:underline hover:text-blue-300 light:hover:text-blue-600"
            >
              <span className="truncate">{webpageUrl}</span>
              <ArrowSquareOut className="flex-shrink-0" />
            </a>
          ) : (
            truncate(title, 45)
          )
        }
        subtitle={
          references > 1 ? `Referenced ${references} times.` : undefined
        }
        onClose={onClose}
      />
      <ModalBody>
        {chunks.map(({ text, score }, idx) => (
          <Fragment key={idx}>
            <div className="text-zinc-100 light:text-slate-900">
              <div className="flex flex-col w-full justify-start gap-y-1">
                <p className="text-zinc-100 light:text-slate-900 whitespace-pre-line">
                  {HTMLDecode(omitChunkHeader(text))}
                </p>

                {!!score && (
                  <div className="w-full flex items-center text-[13px] text-zinc-400 light:text-slate-500 gap-x-2 cursor-default">
                    <div
                      data-tooltip-id="similarity-score"
                      data-tooltip-content={`This is the semantic similarity score of this chunk of text compared to your query calculated by the vector database.`}
                      className="flex items-center gap-x-1"
                    >
                      <Info size={14} />
                      <p>
                        {toPercentString(score)}{" "}
                        {t("chat_window.similarity_match")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {idx !== chunks.length - 1 && (
              <hr className="border-zinc-800 light:border-slate-200" />
            )}
          </Fragment>
        ))}
      </ModalBody>
    </Modal>
  );
}

const supportedSources = [
  "link://",
  "confluence://",
  "github://",
  "gitlab://",
  "gitea://",
  "drupalwiki://",
  "youtube://",
  "obsidian://",
  "paperless-ngx://",
  "gmail-thread://",
  "gmail-attachment://",
  "google-calendar://",
  "outlook-thread://",
  "outlook-attachment://",
];

/**
 * Parses the chunk source to get the correct title and/or display text for citations
 * which contain valid outbound links that can be clicked by the
 * user when viewing a citation. Optionally allows various icons
 * to show distinct types of sources.
 * @param {{title: string, chunks: {text: string, chunkSource: string}[]}} options
 * @returns {{isUrl: boolean, text: string, href: string, icon: string}}
 */
export function parseChunkSource({ title = "", chunks = [] }) {
  const nullResponse = {
    isUrl: false,
    text: null,
    href: null,
    icon: "file",
  };

  if (
    !chunks.length ||
    !supportedSources.some((source) =>
      chunks[0].chunkSource?.startsWith(source)
    )
  )
    return nullResponse;

  try {
    const sourceID = supportedSources.find((source) =>
      chunks[0].chunkSource?.startsWith(source)
    );
    let url, text, icon;

    // Try to parse the URL from the chunk source
    // If it fails, we'll use the title as the text and the link icon
    // but the document will not be linkable
    try {
      url = new URL(chunks[0].chunkSource.split(sourceID)[1]);
    } catch {}

    switch (sourceID) {
      case "link://":
        text = url.host + url.pathname;
        icon = "link";
        break;

      case "youtube://":
        text = title;
        icon = "youtube";
        break;

      case "github://":
        text = title;
        icon = "github";
        break;

      case "gitlab://":
        text = title;
        icon = "gitlab";
        break;

      case "gitea://":
        text = title;
        icon = "gitea";
        break;

      case "confluence://":
        text = title;
        icon = "confluence";
        break;

      case "drupalwiki://":
        text = title;
        icon = "drupalwiki";
        break;

      case "obsidian://":
        text = title;
        icon = "obsidian";
        break;

      case "paperless-ngx://":
        text = title;
        icon = "paperlessNgx";
        break;

      case "gmail-thread://":
        text = title;
        icon = "gmailThread";
        break;
      case "gmail-attachment://":
        text = title;
        icon = "gmailAttachment";
        break;

      case "google-calendar://":
        text = title;
        icon = "googleCalendar";
        break;

      case "outlook-thread://":
        text = title;
        icon = "outlookThread";
        break;

      case "outlook-attachment://":
        text = title;
        icon = "outlookAttachment";
        break;

      default:
        text = url.host + url.pathname;
        icon = "link";
        break;
    }

    return {
      isUrl: !!url,
      href: url?.toString() ?? "#",
      text,
      icon,
    };
  } catch (err) {
    console.warn(`Unsupported source identifier ${chunks[0].chunkSource}`, err);
  }
  return nullResponse;
}
