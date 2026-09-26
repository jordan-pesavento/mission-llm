import React, { useEffect, useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { Link, useLocation } from "react-router-dom";
import { safeJsonParse } from "@/utils/request";
import { isPathMatch } from "@/utils/paths";
import useScrollActiveItemIntoView from "@/hooks/useScrollActiveItemIntoView";

export default function MenuOption({
  btnText,
  icon,
  href,
  childOptions = [],
  flex = false,
  user = null,
  roles = [],
  hidden = false,
  isChild = false,
}) {
  const storageKey = generateStorageKey({ key: btnText });
  const location = useLocation();
  const hasChildren = childOptions.length > 0;
  const hasVisibleChildren = hasVisibleOptions(user, childOptions);
  const { isExpanded, setIsExpanded } = useIsExpanded({
    storageKey,
    hasVisibleChildren,
    childOptions,
    location: location.pathname,
  });

  const containsActiveChild =
    hasChildren &&
    childOptions.some((child) => isPathMatch(child.href, location.pathname));
  const isActive = hasChildren
    ? (!isExpanded && containsActiveChild) || location.pathname === href
    : isPathMatch(href, location.pathname);

  const { ref } = useScrollActiveItemIntoView({
    isActive,
    behavior: "instant",
    block: "center",
  });

  if (hidden) return null;

  // If this option is a parent level option
  if (!isChild) {
    // and has no children then use its flex props and roles prop directly
    if (!hasChildren) {
      if (!flex && !roles.includes(user?.role)) return null;
      if (flex && !!user && !roles.includes(user?.role)) return null;
    }

    // if has children and no visible children - remove it.
    if (hasChildren && !hasVisibleChildren) return null;
  } else {
    // is a child so we use it's permissions
    if (!flex && !roles.includes(user?.role)) return null;
    if (flex && !!user && !roles.includes(user?.role)) return null;
  }

  const handleToggle = (e) => {
    e.preventDefault();
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    localStorage.setItem(storageKey, JSON.stringify(newExpandedState));
  };

  // Child row inside a group: 38px, sits on the group's guide line.
  if (isChild) {
    return (
      <Link
        ref={ref}
        to={href}
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center h-[38px] shrink-0 px-[10px] rounded-[9px] text-[15px] transition-colors duration-150 ${
          isActive
            ? "bg-ml-accent-soft text-ml-text font-semibold"
            : "text-ml-text-2 hover:bg-ml-raised hover:text-ml-text"
        }`}
      >
        <span className="truncate">{btnText}</span>
      </Link>
    );
  }

  const rowClass = `w-full flex items-center gap-x-3 h-[44px] shrink-0 px-[10px] rounded-[10px] text-left text-[15.5px] font-medium transition-colors duration-150 ${
    isActive
      ? hasChildren
        ? "bg-ml-raised text-ml-text"
        : "bg-ml-accent-soft text-ml-text font-semibold"
      : isExpanded && hasChildren
        ? "text-ml-text hover:bg-ml-raised"
        : "text-ml-text-2 hover:bg-ml-raised hover:text-ml-text"
  }`;

  const iconEl = icon ? (
    <span className="w-5 h-5 shrink-0 grid place-items-center">{icon}</span>
  ) : null;

  if (!hasChildren) {
    return (
      <Link
        ref={ref}
        to={href}
        aria-current={isActive ? "page" : undefined}
        className={rowClass}
      >
        {iconEl}
        <span className="flex-1 min-w-0 truncate">{btnText}</span>
      </Link>
    );
  }

  const groupId = `settings-group-${storageKey}`;
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls={groupId}
        className={rowClass}
      >
        {iconEl}
        <span className="flex-1 min-w-0 truncate">{btnText}</span>
        {isExpanded ? (
          <CaretDown size={16} className="shrink-0 text-ml-text-3" />
        ) : (
          <CaretRight size={16} className="shrink-0 text-ml-text-3" />
        )}
      </button>
      {isExpanded && (
        <div
          id={groupId}
          className="flex flex-col gap-y-[2px] shrink-0 mb-[6px] ml-[20px] pl-[12px] border-l border-ml-line-2"
        >
          {childOptions.map((childOption, index) => (
            <MenuOption
              key={index}
              {...childOption} // flex and roles go here.
              user={user}
              isChild={true}
            />
          ))}
        </div>
      )}
    </>
  );
}

function useIsExpanded({
  storageKey = "",
  hasVisibleChildren = false,
  childOptions = [],
  location = null,
}) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (hasVisibleChildren) {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue !== null) {
        return safeJsonParse(storedValue, false);
      }
      return childOptions.some((child) => isPathMatch(child.href, location));
    }
    return false;
  });

  useEffect(() => {
    if (hasVisibleChildren) {
      const shouldExpand = childOptions.some((child) =>
        isPathMatch(child.href, location)
      );
      if (shouldExpand && !isExpanded) {
        setIsExpanded(true);
        localStorage.setItem(storageKey, JSON.stringify(true));
      }
    }
  }, [location]);

  return { isExpanded, setIsExpanded };
}

/**
 * Checks if the child options are visible to the user.
 * This hides the top level options if the child options are not visible
 * for either the users permissions or the child options hidden prop is set to true by other means.
 * If all child options return false for `isVisible` then the parent option will not be visible as well.
 * @param {object} user - The user object.
 * @param {array} childOptions - The child options.
 * @returns {boolean} - True if the child options are visible, false otherwise.
 */
function hasVisibleOptions(user = null, childOptions = []) {
  if (!Array.isArray(childOptions) || childOptions?.length === 0) return false;

  function isVisible({
    roles = [],
    user = null,
    flex = false,
    hidden = false,
  }) {
    if (hidden) return false;
    if (!flex && !roles.includes(user?.role)) return false;
    if (flex && !!user && !roles.includes(user?.role)) return false;
    return true;
  }

  return childOptions.some((opt) =>
    isVisible({ roles: opt.roles, user, flex: opt.flex, hidden: opt.hidden })
  );
}

function generateStorageKey({ key = "" }) {
  const _key = key.replace(/\s+/g, "_").toLowerCase();
  return `mission_llm_menu_${_key}_expanded`;
}
