import useLoginMode from "@/hooks/useLoginMode";
import usePfp from "@/hooks/usePfp";
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
 * The user identity lives in the rail foot (avatar, name, role). Clicking it
 * opens the same menu the old floating top-right button had: Account,
 * Support and Sign out. The floating button is only rendered as a fallback on
 * pages that have no rail (UserMenu checks whether a RailUser is mounted), so
 * the chat top bar owns the right edge everywhere else.
 */

let railUserMounts = 0;
const railUserListeners = new Set();
function emitRailUserChange() {
  railUserListeners.forEach((listener) => listener(railUserMounts));
}

/** True while at least one RailUser row is mounted on the page. */
export function useRailUserMounted() {
  const [mounted, setMounted] = useState(railUserMounts > 0);
  useLayoutEffect(() => {
    const listener = (count) => setMounted(count > 0);
    railUserListeners.add(listener);
    listener(railUserMounts);
    return () => railUserListeners.delete(listener);
  }, []);
  return mounted;
}

function useRegisterRailUser() {
  useLayoutEffect(() => {
    railUserMounts += 1;
    emitRailUserChange();
    return () => {
      railUserMounts -= 1;
      emitRailUserChange();
    };
  }, []);
}

function useSupportLink() {
  const [supportEmail, setSupportEmail] = useState("");
  useEffect(() => {
    const fetchSupportEmail = async () => {
      const supportEmail = await System.fetchSupportEmail();
      setSupportEmail(
        supportEmail?.email ? `mailto:${supportEmail.email}` : paths.issues()
      );
    };
    fetchSupportEmail();
  }, []);
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
  return (
    <div role="menu" className={className}>
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

/** Round avatar: profile picture when set, otherwise the username initials. */
function Avatar({ mode }) {
  const { pfp } = usePfp();
  const { user: ctxUser } = useUser();
  const user = ctxUser || userFromStorage();

  return (
    <span
      aria-hidden="true"
      className="w-[38px] h-[38px] shrink-0 rounded-full grid place-items-center overflow-hidden border border-ml-line-2 text-[14px] font-semibold uppercase text-[#E9EFF9]"
      style={{
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

/**
 * The rail foot's user row: avatar, name and role (real account data) as one
 * button that opens the user menu, followed by any trailing actions (footer
 * links, settings gear).
 */
export function RailUser({ children = null }) {
  useRegisterRailUser();
  const mode = useLoginMode();
  const { user } = useUser();
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

  if (mode === null) {
    // Single user without a password: there is no account to show.
    return (
      <div className="flex items-center justify-end gap-x-1 min-h-[38px]">
        {children}
      </div>
    );
  }

  const name = mode === "multi" ? user?.username : null;
  const role = mode === "multi" ? user?.role : null;

  return (
    <div className="relative flex items-center gap-x-2 min-h-[38px] px-[2px]">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        aria-label={name ? `${name}, account menu` : "Account menu"}
        className="flex flex-1 min-w-0 items-center gap-x-3 -my-1 -ml-1 p-1 pr-2 rounded-[12px] text-left hover:bg-ml-raised transition-colors duration-150"
      >
        <Avatar mode={mode} />
        {!!name && (
          <span className="flex flex-col min-w-0">
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
          </span>
        )}
      </button>
      {children}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute left-0 bottom-[calc(100%+10px)] min-w-[200px] max-w-full"
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
    </div>
  );
}

/**
 * Floating fallback for pages without a rail (for example the workspace
 * settings page on a touch device). Same menu as the rail row.
 */
export default function UserButton() {
  const mode = useLoginMode();
  const { user } = useUser();
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

  if (mode === null) return null;
  return (
    <div className="absolute top-3 right-4 md:top-[13px] md:right-4 w-fit h-fit z-40">
      <button
        ref={buttonRef}
        onClick={() => setShowMenu((prev) => !prev)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={showMenu}
        aria-label="Account menu"
        className="rounded-full transition-opacity duration-150 hover:opacity-85"
      >
        <Avatar mode={mode} />
      </button>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-[calc(100%+8px)] right-0 min-w-[200px]"
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
    </div>
  );
}
