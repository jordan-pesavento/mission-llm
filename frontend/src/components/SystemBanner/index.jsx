import { createPortal } from "react-dom";
import useBranding from "@/hooks/useBranding";

/**
 * Classification or status banner (Branding > System banner), shown at the
 * top and optionally the bottom of every screen, including sign-in and
 * onboarding. Mounted once at the app root.
 *
 * The bars are fixed to the viewport edges. They never cover content: while
 * the banner is on, BrandingProvider sets --ml-banner-top/--ml-banner-bottom
 * and data-ml-banner on <html>, and index.css fits the app, overlays and
 * modals between the bars.
 */
export default function SystemBanner() {
  const { brand } = useBranding();
  const banner = brand?.banner;
  if (!banner?.enabled || typeof document === "undefined") return null;

  return createPortal(
    <>
      <BannerBar banner={banner} edge="top" />
      {banner.position !== "top" && <BannerBar banner={banner} edge="bottom" />}
    </>,
    document.body
  );
}

function BannerBar({ banner, edge }) {
  const isTop = edge === "top";
  return (
    <div
      data-system-banner={edge}
      role={isTop ? "note" : undefined}
      aria-label={isTop ? "System banner" : undefined}
      // The bottom bar repeats the top one; read it once.
      aria-hidden={isTop ? undefined : true}
      className="fixed inset-x-0 z-[2147483000] flex h-[26px] select-none items-center justify-center overflow-hidden px-4 font-sans text-[13.5px] font-bold uppercase leading-none tracking-[0.16em]"
      // Inline offsets so the banner layout rules in index.css (which move
      // fixed top-0 / bottom-0 elements inside the banners) never apply here.
      style={{
        top: isTop ? 0 : "auto",
        bottom: isTop ? "auto" : 0,
        backgroundColor: banner.bg,
        color: banner.fg,
      }}
    >
      <span className="min-w-0 truncate">{banner.text}</span>
    </div>
  );
}
