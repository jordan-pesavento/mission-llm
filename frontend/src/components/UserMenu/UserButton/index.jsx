import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
import useBranding from "@/hooks/useBranding";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import paths from "@/utils/paths";
import { userFromStorage } from "@/utils/request";
import { Lifebuoy, Person, SignOut, UserCircle } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import AccountModal from "../AccountModal";
import {
  AUTH_TIMESTAMP,
  AUTH_TOKEN,
  AUTH_USER,
  LAST_VISITED_WORKSPACE,
  USER_PROMPT_INPUT_MAP,
} from "@/utils/constants";
import { useTranslation } from "react-i18next";

/*
 * The user avatar sits in the top-right corner of every screen (owner's
 * choice). The chat top bar renders it in flow at its right end (TopBarUser);
 * every other page gets the floating UserButton at the same spot: 38px,
 * centered in the 64px top band, on the right gutter. Clicking it opens the
 * menu: who is signed in, then Account, Support and Sign out.
 *
 * Instance settings pages (the ones with the settings rail) have a page head
 * instead of a top bar. There the avatar has the head's geometry on every
 * page, floating or in a SettingsPageHead: 42px with a 12px radius, like the
 * head's buttons, at --ml-set-avatar-top on the right gutter. So it neither
 * moves nor changes size between settings pages.
 */

/** Size and corner radius of the avatar on instance settings pages. */
export const SETTINGS_AVATAR = { size: 42, radius: 12 };

/**
 * A mount counter shared across components: `useRegister(enabled)` counts a
 * component while it is mounted, `useMounted()` is true while the count is
 * above zero.
 */
function createMountRegistry() {
  let mounts = 0;
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener(mounts));
  return {
    useMounted() {
      const [mounted, setMounted] = useState(mounts > 0);
      useLayoutEffect(() => {
        const listener = (count) => setMounted(count > 0);
        listeners.add(listener);
        listener(mounts);
        return () => listeners.delete(listener);
      }, []);
      return mounted;
    },
    useRegister(enabled = true) {
      useLayoutEffect(() => {
        if (!enabled) return;
        mounts += 1;
        emit();
        return () => {
          mounts -= 1;
          emit();
        };
      }, [enabled]);
    },
  };
}

const inlineUser = createMountRegistry();
const settingsPage = createMountRegistry();

/** True while a top bar renders its own avatar, so the floating one hides. */
export const useInlineUserMounted = inlineUser.useMounted;

/**
 * Called by the desktop settings rail: while it is mounted the floating
 * avatar takes the settings page head geometry (SETTINGS_AVATAR).
 */
export const useRegisterSettingsPage = settingsPage.useRegister;

/**
 * Support link for the account menu: mailto: the Branding support email, else
 * the issue tracker. Refetches whenever the saved brand changes (a Branding
 * save in this tab, another tab, or by another admin).
 */
function useSupportLink() {
  const [supportEmail, setSupportEmail] = useState("");
  const { savedBrand } = useBranding();
  const brandVersion = savedBrand?.version || null;
  useEffect(() => {
    let active = true;
    System.fetchSupportEmail(brandVersion).then((supportEmail) => {
      if (!active) return;
      setSupportEmail(
        supportEmail?.email ? `mailto:${supportEmail.email}` : paths.issues()
      );
    });
    return () => {
      active = false;
    };
  }, [brandVersion]);
  return supportEmail;
}

function signOut() {
  window.localStorage.removeItem(AUTH_USER);
  window.localStorage.removeItem(AUTH_TOKEN);
  window.localStorage.removeItem(AUTH_TIMESTAMP);
  window.localStorage.removeItem(LAST_VISITED_WORKSPACE);
  window.localStorage.removeItem(USER_PROMPT_INPUT_MAP);
  window.location.replace(paths.home());
}

/**
 * Shared open/close state for the user menu: closes on an outside press and
 * on Escape.
 */
function useUserMenu() {
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  useEffect(() => {
    if (!showMenu) return;
    const handleClose = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        !buttonRef.current?.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;
      setShowMenu(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showMenu]);

  return {
    menuRef,
    buttonRef,
    showMenu,
    setShowMenu,
    showAccountSettings,
    openAccount: () => {
      setShowAccountSettings(true);
      setShowMenu(false);
    },
    closeAccount: () => setShowAccountSettings(false),
  };
}

const MENU_ITEM =
  "w-full h-[38px] flex items-center gap-x-2.5 px-3 rounded-[8px] text-left text-[15px] font-medium text-ml-text hover:bg-ml-raised-2 transition-colors duration-150 whitespace-nowrap";

function UserMenuItems({ mode, user, supportEmail, onAccount, className }) {
  const { t } = useTranslation();
  const name = mode === "multi" ? user?.username : null;
  const role = mode === "multi" ? user?.role : null;
  return (
    <div role="menu" className={className}>
      {!!name && (
        <div className="flex flex-col min-w-0 px-3 pt-2 pb-2.5 mb-1 border-b border-ml-line">
          <span
            className="text-[15px] font-semibold leading-[1.3] text-ml-text truncate"
            title={name}
          >
            {name}
          </span>
          {!!role && (
            <span className="ml-mono text-[13px] font-medium leading-[1.35] text-ml-text-3 capitalize truncate">
              {role}
            </span>
          )}
        </div>
      )}
      {mode === "multi" && !!user && (
        <button
          type="button"
          role="menuitem"
          onClick={onAccount}
          className={MENU_ITEM}
        >
          <UserCircle size={18} className="text-ml-text-2 shrink-0" />
          {t("profile_settings.account")}
        </button>
      )}
      <a
        role="menuitem"
        href={supportEmail}
        target={supportEmail.startsWith("mailto:") ? undefined : "_blank"}
        rel="noreferrer"
        className={MENU_ITEM}
      >
        <Lifebuoy size={18} className="text-ml-text-2 shrink-0" />
        {t("profile_settings.support")}
      </a>
      <button
        type="button"
        role="menuitem"
        onClick={signOut}
        className={MENU_ITEM}
      >
        <SignOut size={18} className="text-ml-text-2 shrink-0" />
        {t("profile_settings.signout")}
      </button>
    </div>
  );
}

const MENU_SURFACE =
  "p-1.5 flex flex-col gap-y-0.5 rounded-[12px] bg-ml-raised border border-ml-line-2 shadow-ml-pop z-50";

/**
 * Avatar: profile picture when set, otherwise the username initials. Round
 * and 38px by default (the top bar's control size); settings pages show it
 * at SETTINGS_AVATAR, the size and radius of the head's buttons.
 * @param {{size?: number, radius?: number|null}} props - radius in px, null for round
 */
function Avatar({ mode, size = 38, radius = null }) {
  const { pfp } = usePfp();
  const { user: ctxUser } = useUser();
  const user = ctxUser || userFromStorage();

  return (
    <span
      aria-hidden="true"
      className="shrink-0 grid place-items-center overflow-hidden border border-ml-line-2 text-[14px] font-semibold uppercase text-[#E9EFF9]"
      style={{
        width: size,
        height: size,
        borderRadius: radius === null ? "9999px" : radius,
        backgroundColor: "#21345A",
        backgroundImage: "linear-gradient(180deg, #2A3F66, #18284A)",
      }}
    >
      {mode === "multi" && pfp ? (
        <img
          src={pfp}
          alt=""
          className="w-full h-full object-cover bg-ml-raised-2"
        />
      ) : mode === "multi" ? (
        user?.username?.slice(0, 2) || "AA"
      ) : (
        <Person size={16} weight="bold" />
      )}
    </span>
  );
}

/** Opens the user menu below the avatar, aligned to its right edge. */
function AvatarMenu({ mode, user, label, size, radius = null }) {
  const supportEmail = useSupportLink();
  const {
    menuRef,
    buttonRef,
    showMenu,
    setShowMenu,
    showAccountSettings,
    openAccount,
    closeAccount,
  } = useUserMenu();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        aria-label={label}
        className="grid place-items-center transition-opacity duration-150 hover:opacity-85 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--ml-accent-soft)]"
        style={{ borderRadius: radius === null ? "9999px" : radius }}
      >
        <Avatar mode={mode} size={size} radius={radius} />
      </button>
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-[calc(100%+8px)] right-0 min-w-[220px] max-w-[320px] z-50"
        >
          <UserMenuItems
            mode={mode}
            user={user}
            supportEmail={supportEmail}
            onAccount={openAccount}
            className={MENU_SURFACE}
          />
        </div>
      )}
      {user && showAccountSettings && (
        <AccountModal user={user} hideModal={closeAccount} />
      )}
    </>
  );
}

function accountLabel(mode, user) {
  const name = mode === "multi" ? user?.username : null;
  return name ? `${name}, account menu` : "Account menu";
}

/**
 * The avatar in flow at the right end of a top bar, or of a settings page
 * head (SettingsPageHead, with `settings`). While it is mounted the floating
 * button stays hidden, so there is only ever one avatar on screen.
 * @param {{settings?: boolean}} props - true for the settings head geometry
 */
export function TopBarUser({ settings = false }) {
  inlineUser.useRegister();
  const mode = useLoginMode();
  const { user } = useUser();
  if (mode === null) return null;
  return (
    <div data-user-avatar className="relative shrink-0">
      <AvatarMenu
        mode={mode}
        user={user}
        label={accountLabel(mode, user)}
        {...(settings ? SETTINGS_AVATAR : {})}
      />
    </div>
  );
}

/**
 * The avatar for pages without a chat top bar (settings, admin, workspace
 * settings): fixed in the top-right corner. On a page with a top bar it sits
 * where TopBarUser would; on an instance settings page it sits where a
 * SettingsPageHead puts its avatar.
 */
export default function UserButton() {
  const mode = useLoginMode();
  const { user } = useUser();
  const onSettingsPage = settingsPage.useMounted();

  if (mode === null) return null;
  return (
    <div
      data-user-avatar
      className="fixed z-40 w-fit h-fit"
      style={{
        top: onSettingsPage
          ? "calc(var(--ml-banner-top, 0px) + var(--ml-set-avatar-top))"
          : "calc(var(--ml-banner-top, 0px) + (var(--ml-topbar-h) - var(--ml-ctl)) / 2)",
        right: "var(--ml-gutter)",
      }}
    >
      <AvatarMenu
        mode={mode}
        user={user}
        label={accountLabel(mode, user)}
        {...(onSettingsPage ? SETTINGS_AVATAR : {})}
      />
    </div>
  );
}
