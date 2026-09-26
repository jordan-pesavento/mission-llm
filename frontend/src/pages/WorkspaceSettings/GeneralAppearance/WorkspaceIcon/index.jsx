import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "react-tooltip";
import { MagnifyingGlass, Shapes, TextAa } from "@phosphor-icons/react";
import {
  SettingsSegmented,
  SettingsSwatch,
  SET_INPUT,
} from "@/components/SettingsPage";
import WorkspaceTile from "@/components/WorkspaceTile";
import { WORKSPACE_ICON_COMPONENTS } from "@/components/WorkspaceTile/icons";
import {
  DEFAULT_TILE_COLOR,
  WORKSPACE_ICON_GROUPS,
  WORKSPACE_TILE_COLORS,
  searchWorkspaceIcons,
  suggestWorkspaceIcon,
  tileColorKey,
  tileIconKey,
} from "@/components/WorkspaceTile/iconLibrary";

const TOOLTIP_ID = "workspace-icon-name";

/**
 * Workspace settings > General: how the workspace's tile looks. Initials (the
 * default) or an icon from the library, in a palette color, with a preview of
 * the rail row. Saves with the page's form: the hidden `icon` and `iconColor`
 * inputs are read by the page's Update Workspace submit (empty means the
 * default, sent as null). Each one is only in the form while it differs from
 * the saved value, so saving another field from this page never writes back
 * a tile that someone else changed after the page loaded.
 *
 * @param {Object} props
 * @param {Object} props.workspace the saved workspace
 * @param {string} props.name the workspace name as currently typed
 * @param {Function} props.setHasChanges
 */
export default function WorkspaceIcon({ workspace, name, setHasChanges }) {
  const { t } = useTranslation();
  const savedIcon = tileIconKey(workspace?.icon);
  const savedColor = tileColorKey(workspace?.iconColor);
  const [style, setStyle] = useState(savedIcon ? "icon" : "initials");
  const [icon, setIcon] = useState(savedIcon);
  const [color, setColor] = useState(savedColor ?? DEFAULT_TILE_COLOR);

  // After a save the page holds the stored row, which can carry a tile that
  // someone else set in the meantime: show that, so the next save compares
  // against it and does not undo it.
  useEffect(() => {
    setStyle(savedIcon ? "icon" : "initials");
    if (savedIcon) setIcon(savedIcon);
    setColor(savedColor ?? DEFAULT_TILE_COLOR);
  }, [savedIcon, savedColor]);

  const iconValue = style === "icon" ? icon : null;
  const colorValue = tileColorKey(color);

  function changeStyle(next) {
    if (next === style) return;
    setStyle(next);
    // First switch to an icon: start from one that fits the workspace name.
    if (next === "icon" && !icon) setIcon(suggestWorkspaceIcon(name));
    setHasChanges(true);
  }

  function changeIcon(next) {
    if (next === icon) return;
    setIcon(next);
    setHasChanges(true);
  }

  function changeColor(next) {
    if (next === color) return;
    setColor(next);
    setHasChanges(true);
  }

  return (
    <div className="flex flex-col gap-y-[8px]">
      <div className="flex flex-col gap-y-[8px]">
        <h3 id="workspace-icon-title" className="input-label">
          {t("general.icon.title")}
        </h3>
        <p className="text-[14px] leading-[1.5] font-medium text-ml-text-2">
          {t("general.icon.description")}
        </p>
      </div>
      {iconValue !== savedIcon && (
        <input type="hidden" name="icon" value={iconValue ?? ""} />
      )}
      {colorValue !== savedColor && (
        <input type="hidden" name="iconColor" value={colorValue ?? ""} />
      )}

      <div className="flex flex-col gap-y-4 mt-1">
        <TilePreview name={name} icon={iconValue} iconColor={colorValue} />

        <SettingsSegmented
          label={t("general.icon.style")}
          value={style}
          onChange={changeStyle}
          options={[
            {
              value: "initials",
              label: t("general.icon.initials"),
              icon: TextAa,
            },
            { value: "icon", label: t("general.icon.icon"), icon: Shapes },
          ]}
        />

        {style === "icon" && <IconLibrary value={icon} onChange={changeIcon} />}

        <div className="flex flex-col gap-y-2">
          <span
            id="workspace-icon-color"
            className="text-[14.5px] font-semibold text-ml-text-2"
          >
            {t("general.icon.color")}
          </span>
          {/* One row of ten where it fits (10 x 40px + 9 gaps = 490px),
              otherwise two even rows of five. */}
          <div className="[container-type:inline-size]">
            <div
              role="group"
              aria-labelledby="workspace-icon-color"
              className="grid grid-cols-[repeat(5,40px)] gap-2.5 [@container(min-width:490px)]:grid-cols-[repeat(10,40px)]"
            >
              {WORKSPACE_TILE_COLORS.map((key) => (
                <SettingsSwatch
                  key={key}
                  color={
                    key === DEFAULT_TILE_COLOR
                      ? "var(--ml-accent)"
                      : `var(--ml-tile-${key})`
                  }
                  label={t(`general.icon.colors.${key}`)}
                  pressed={color === key}
                  onClick={() => changeColor(key)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The workspace's rail row as the sidebar will draw it, open (active) and
 * not open (inactive), with the unsaved choices.
 */
function TilePreview({ name, icon, iconColor }) {
  const { t } = useTranslation();
  const rows = [
    { selected: true, caption: t("general.icon.active") },
    { selected: false, caption: t("general.icon.inactive") },
  ];
  return (
    <figure className="flex flex-col gap-y-2 m-0">
      <figcaption className="text-[14.5px] font-semibold text-ml-text-2">
        {t("general.icon.preview")}
      </figcaption>
      {/* The rows are as wide as the rail's, so a long name truncates where
          the sidebar truncates it. The state captions sit outside. */}
      <div className="flex items-start gap-x-3.5">
        <div className="w-[var(--ml-rail-w)] min-w-0 shrink flex flex-col gap-y-[6px] p-[14px] rounded-[14px] border border-ml-line bg-ml-rail overflow-hidden">
          {rows.map(({ selected, caption }) => (
            <div
              key={caption}
              className={`relative flex items-center gap-x-3 h-[46px] pl-[10px] pr-[8px] rounded-[12px] ${
                selected
                  ? "bg-ml-raised text-ml-text shadow-[inset_0_0_0_1px_var(--ml-line)]"
                  : "text-ml-text-2"
              }`}
            >
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute left-[-14px] top-[11px] bottom-[11px] w-[3px] rounded-r-[3px] bg-ml-accent"
                />
              )}
              <WorkspaceTile
                name={name}
                icon={icon}
                iconColor={iconColor}
                selected={selected}
                aria-hidden="true"
              />
              <span className="flex-1 min-w-0 truncate text-[15.5px] font-semibold">
                {name}
              </span>
              <span className="sr-only">{caption}</span>
            </div>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="shrink-0 flex flex-col gap-y-[6px] pt-[15px]"
        >
          {rows.map(({ caption }) => (
            <span
              key={caption}
              className="h-[46px] flex items-center text-[13px] font-medium text-ml-text-3"
            >
              {caption}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

/**
 * Searchable, grouped grid of the library's icons. One tab stop: arrow keys
 * move between icons (up and down by visual row), Home and End jump to the
 * first and last, Enter or Space picks.
 */
function IconLibrary({ value, onChange }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [focusKey, setFocusKey] = useState(null);
  const gridRef = useRef(null);
  // Column kept across up and down moves, so a short row does not pull
  // focus sideways for good.
  const columnX = useRef(null);

  // Open on the chosen icon: scroll the library (not the page) to it.
  useEffect(() => {
    const grid = gridRef.current;
    const button = grid?.querySelector('[aria-pressed="true"]');
    if (!button) return;
    const gridBox = grid.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    if (box.top >= gridBox.top && box.bottom <= gridBox.bottom) return;
    grid.scrollTop += box.top - gridBox.top - (gridBox.height - box.height) / 2;
  }, []);

  const labelFor = (key) => t(`general.icon.names.${key}`);
  const groups = useMemo(() => {
    const matches = searchWorkspaceIcons(query, labelFor);
    return WORKSPACE_ICON_GROUPS.map((group) => ({
      group,
      icons: matches.filter((entry) => entry.group === group),
    })).filter(({ icons }) => icons.length > 0);
  }, [query, t]);

  const visible = groups.flatMap(({ icons }) => icons.map(({ key }) => key));
  const tabKey = [focusKey, value].find((key) => visible.includes(key));
  const tabStop = tabKey ?? visible[0];

  function onKeyDown(e) {
    const buttons = [...gridRef.current.querySelectorAll("[data-icon-key]")];
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;
    let next = null;
    if (e.key === "ArrowRight") next = Math.min(index + 1, buttons.length - 1);
    if (e.key === "ArrowLeft") next = Math.max(index - 1, 0);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = buttons.length - 1;
    const vertical = e.key === "ArrowDown" || e.key === "ArrowUp";
    if (vertical) {
      if (columnX.current === null) {
        const box = buttons[index].getBoundingClientRect();
        columnX.current = box.left + box.width / 2;
      }
      next = nearestInNextRow(
        buttons,
        index,
        e.key === "ArrowDown" ? 1 : -1,
        columnX.current
      );
    }
    if (next === null) return;
    e.preventDefault();
    if (!vertical) columnX.current = null;
    const button = buttons[next];
    setFocusKey(button.dataset.iconKey);
    button.focus();
    button.scrollIntoView({ block: "nearest" });
  }

  // As wide as the largest group needs (13 icons of 40px, 6px gaps, the
  // padding, border and scrollbar), so a wide page does not stretch it.
  return (
    <div className="flex flex-col gap-y-2.5 max-w-[640px]">
      <div className="relative">
        <MagnifyingGlass
          size={18}
          aria-hidden="true"
          className="absolute left-[14px] top-1/2 -translate-y-1/2 text-ml-text-3 pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            columnX.current = null;
          }}
          onKeyDown={(e) => {
            // Enter in the search field must not submit the settings form.
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder={t("general.icon.search")}
          aria-label={t("general.icon.search")}
          autoComplete="off"
          className={`${SET_INPUT} search-input pl-[42px]`}
        />
      </div>
      <div
        ref={gridRef}
        role="group"
        aria-label={t("general.icon.library")}
        onKeyDown={onKeyDown}
        onPointerDown={() => (columnX.current = null)}
        className="max-h-[344px] overflow-y-auto p-3 rounded-[12px] border border-ml-line-2 bg-ml-panel flex flex-col gap-y-3"
      >
        {groups.length === 0 && (
          <p className="py-6 text-center text-[14.5px] text-ml-text-2">
            {t("general.icon.no-results")}
          </p>
        )}
        {groups.map(({ group, icons }) => (
          <section
            key={group}
            aria-labelledby={`workspace-icon-group-${group}`}
            className="flex flex-col gap-y-1.5"
          >
            <h4
              id={`workspace-icon-group-${group}`}
              className="px-0.5 text-[13px] font-semibold text-ml-text-3"
            >
              {t(`general.icon.groups.${group}`)}
            </h4>
            <div className="grid grid-cols-[repeat(auto-fill,40px)] gap-1.5">
              {icons.map(({ key }) => {
                const Icon = WORKSPACE_ICON_COMPONENTS[key];
                const selected = key === value;
                return (
                  <button
                    key={key}
                    type="button"
                    data-icon-key={key}
                    aria-pressed={selected}
                    aria-label={labelFor(key)}
                    data-tooltip-id={TOOLTIP_ID}
                    data-tooltip-content={labelFor(key)}
                    tabIndex={key === tabStop ? 0 : -1}
                    onFocus={() => setFocusKey(key)}
                    onClick={() => onChange(key)}
                    className={`w-10 h-10 grid place-items-center rounded-[10px] border cursor-pointer outline-none transition-colors duration-150 focus-visible:shadow-[inset_0_0_0_2px_var(--ml-focus)] ${
                      selected
                        ? "border-ml-accent-line bg-ml-accent-soft text-ml-accent-text"
                        : "border-transparent text-ml-text-2 hover:bg-ml-raised-2 hover:text-ml-text"
                    }`}
                  >
                    <Icon size={22} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <Tooltip
        id={TOOLTIP_ID}
        place="top"
        delayShow={300}
        openEvents={{ mouseenter: true, focus: true }}
        closeEvents={{ mouseleave: true, blur: true }}
        globalCloseEvents={{ escape: true }}
        className="tooltip !text-xs z-99"
      />
    </div>
  );
}

/**
 * Index of the button in the visual row above or below `index` whose center
 * is closest to `centerX`, or `index` itself at the first or last row.
 * @param {HTMLElement[]} buttons
 * @param {number} index
 * @param {1|-1} direction
 * @param {number} centerX the column to stay in, in viewport px
 */
function nearestInNextRow(buttons, index, direction, centerX) {
  const boxes = buttons.map((button) => button.getBoundingClientRect());
  const current = boxes[index];
  const center = centerX;
  const rowTops = boxes
    .map((box) => box.top)
    .filter((top) =>
      direction > 0 ? top > current.top + 4 : top < current.top - 4
    );
  if (rowTops.length === 0) return index;
  const rowTop = direction > 0 ? Math.min(...rowTops) : Math.max(...rowTops);
  let best = index;
  let bestDistance = Infinity;
  boxes.forEach((box, i) => {
    if (Math.abs(box.top - rowTop) > 4) return;
    const distance = Math.abs(box.left + box.width / 2 - center);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}
