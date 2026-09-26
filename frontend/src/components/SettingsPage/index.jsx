/**
 * Shared pieces for instance settings pages (concept 1): the page head, the
 * two-column settings row, and the field and button styles. Colors come from
 * the --ml-* tokens so both themes follow automatically.
 */

import { TopBarUser } from "@/components/UserMenu";

// 44px text field on the panel fill, accent border and soft ring on focus.
export const SET_FIELD =
  "block w-full h-field px-[14px] rounded-[12px] border border-ml-line-2 bg-ml-panel text-ml-text text-[16px] font-normal placeholder:text-ml-text-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-ml-accent-line focus:shadow-[0_0_0_4px_var(--ml-accent-soft)]";

// SET_FIELD on the form-field tokens (--ml-field-bg, --ml-field-line), so the
// field stands out from the page and from panels like every other form field
// in the app. Same size, radius, type and focus ring as SET_FIELD.
export const SET_INPUT =
  "block w-full h-field px-[14px] rounded-[12px] border border-[color:var(--ml-field-line)] bg-[var(--ml-field-bg)] text-ml-text text-[16px] font-normal placeholder:text-ml-text-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-ml-accent-line focus:shadow-[0_0_0_4px_var(--ml-accent-soft)]";

// 42px secondary button (Reset, Clear).
export const SET_BTN =
  "h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-[12px] border border-ml-line-2 bg-ml-raised text-ml-text font-semibold text-[15px] whitespace-nowrap cursor-pointer transition-colors duration-150 hover:border-ml-accent-line disabled:opacity-60 disabled:cursor-default";

// 42px primary button (Save).
export const SET_BTN_PRIMARY =
  "h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-[12px] border border-transparent bg-ml-accent-fill text-ml-on-accent font-semibold text-[15px] whitespace-nowrap cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter] duration-150 hover:brightness-105 disabled:opacity-60 disabled:cursor-default";

// 34px small button used inside cards (Replace, Remove).
export const SET_SBTN =
  "h-[34px] inline-flex items-center gap-1.5 px-[11px] rounded-[9px] border border-ml-line-2 bg-ml-raised text-ml-text font-semibold text-[14px] whitespace-nowrap cursor-pointer transition-colors duration-150 hover:border-ml-accent-line";

/**
 * Page title, description and optional actions on the right. Pass
 * `divider={false}` when a tab bar sits directly under the head and draws the
 * hairline itself.
 *
 * The account avatar sits at the end of the action row (in place of the
 * floating one), with the buttons' 42px height and 12px radius, so the
 * actions end at the page gutter. The row sits at --ml-set-avatar-top, the
 * spot where every other settings page shows the floating avatar, and stays
 * there when the description wraps.
 */
export function SettingsPageHead({
  title,
  description,
  actions = null,
  divider = true,
}) {
  return (
    <div
      data-settings-head
      className={`flex items-start flex-wrap gap-4 pt-[22px] pb-4 ${divider ? "border-b border-ml-line" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <h1 className="font-display [font-stretch:112%] font-[650] text-[27px] leading-[1.2] tracking-[0.01em] text-ml-text">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[16px] leading-[1.5] text-ml-text-2">
            {description}
          </p>
        )}
      </div>
      <div
        data-settings-actions
        className="flex flex-wrap items-center gap-2.5 mt-[calc(var(--ml-set-avatar-top)-22px)]"
      >
        {actions}
        <TopBarUser settings />
      </div>
    </div>
  );
}

/**
 * One settings row: the setting's name and description on the left, its
 * controls on the right. Stacks below a 1100px viewport.
 */
export function SettingsRow({
  title,
  description,
  children,
  as = "div",
  ...props
}) {
  const Tag = as;
  return (
    <Tag
      className="grid grid-cols-1 min-[1100px]:grid-cols-[minmax(200px,0.75fr)_minmax(0,1.6fr)] gap-x-7 gap-y-3 py-6 border-b border-ml-line last:border-b-0"
      {...props}
    >
      <div className="min-w-0">
        <h3 className="text-[16.5px] font-[650] leading-snug text-ml-text">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[15px] leading-[1.55] text-ml-text-2">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0 flex flex-col gap-2.5">{children}</div>
    </Tag>
  );
}

/**
 * Label above a field inside a settings row. `error` renders a message under
 * the field.
 */
export function SettingsField({ label, children, error = null }) {
  return (
    <label className="flex flex-col gap-1.5 text-[14.5px] font-semibold text-ml-text-2">
      {label}
      {children}
      {error && <SettingsFieldError>{error}</SettingsFieldError>}
    </label>
  );
}

// Red border and ring on a SET_FIELD input that carries aria-invalid="true".
export const SET_FIELD_INVALID =
  "aria-[invalid=true]:border-ml-bad aria-[invalid=true]:focus:border-ml-bad aria-[invalid=true]:focus:shadow-[0_0_0_4px_var(--ml-bad-soft)]";

/**
 * Validation message under a field.
 */
export function SettingsFieldError({ children, id }) {
  return (
    <span
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-[14px] font-medium leading-[1.45] text-ml-bad"
    >
      {children}
    </span>
  );
}

/**
 * Tab bar under a page head (48px tabs, accent underline on the active tab).
 * Arrow keys move between tabs. `tabs` is [{ id, label, icon, alert }], where
 * `alert` marks a tab that holds a validation error.
 */
export function SettingsTabs({ tabs, active, onChange, label, idPrefix }) {
  function onKeyDown(e) {
    const index = tabs.findIndex((tab) => tab.id === active);
    let next = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(`${idPrefix}-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex gap-0.5 border-b border-ml-line overflow-x-auto [scrollbar-width:none]"
    >
      {tabs.map(({ id, label: tabLabel, icon: Icon, alert }) => {
        const selected = id === active;
        return (
          <button
            key={id}
            id={`${idPrefix}-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`relative h-12 -mb-px inline-flex items-center gap-2 px-3.5 border-0 border-b-2 bg-transparent text-[15px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--ml-focus)] rounded-t-[8px] ${
              selected
                ? "text-ml-text border-ml-accent"
                : "text-ml-text-2 border-transparent hover:text-ml-text"
            }`}
          >
            {Icon && <Icon size={18} aria-hidden="true" />}
            {tabLabel}
            {alert && (
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full bg-ml-bad shrink-0"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * On/off switch with a label (accent fill when on). Renders a real
 * role="switch" button so it works with the keyboard and screen readers.
 */
export function SettingsToggle({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  describedBy,
}) {
  return (
    <div className="flex items-center gap-3 min-h-[40px]">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-[44px] h-[26px] rounded-full border transition-colors duration-150 outline-none focus-visible:shadow-[0_0_0_4px_var(--ml-accent-soft)] disabled:opacity-50 disabled:cursor-default cursor-pointer ${
          checked
            ? "bg-ml-accent-fill border-transparent"
            : "bg-ml-raised-2 border-ml-line-2"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-1/2 -translate-y-1/2 left-[3px] w-[18px] h-[18px] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform duration-150 ${
            checked
              ? "translate-x-[18px] bg-[var(--ml-on-accent)]"
              : "translate-x-0 bg-ml-text-2"
          }`}
        />
      </button>
      {label && (
        <label
          htmlFor={id}
          className={`text-[15.5px] font-medium leading-snug text-ml-text ${disabled ? "opacity-60" : "cursor-pointer"}`}
        >
          {label}
        </label>
      )}
    </div>
  );
}

/**
 * Segmented choice (one of a few options), 44px tall to match fields.
 * `options` is [{ value, label, icon }].
 */
export function SettingsSegmented({ options, value, onChange, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex max-w-full self-start h-field p-[3px] gap-[3px] rounded-[12px] border border-ml-line-2 bg-ml-panel"
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={`h-full inline-flex items-center gap-2 px-3.5 rounded-[9px] text-[15px] font-semibold whitespace-nowrap cursor-pointer transition-colors duration-150 outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--ml-focus)] ${
              selected
                ? "bg-ml-raised-2 text-ml-text shadow-[inset_0_1px_0_var(--ml-inset-hi),0_1px_3px_rgba(0,0,0,0.25)]"
                : "bg-transparent text-ml-text-2 hover:text-ml-text"
            }`}
          >
            {Icon && <Icon size={17} aria-hidden="true" />}
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 40px color swatch button. `pressed` draws the selection ring.
 */
export function SettingsSwatch({ color, label, pressed, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ background: color }}
      className={`w-10 h-10 shrink-0 rounded-[12px] border-2 cursor-pointer shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] outline-none transition-transform duration-100 hover:-translate-y-px focus-visible:shadow-[0_0_0_4px_var(--ml-accent-soft),inset_0_0_0_1px_rgba(255,255,255,0.18)] ${
        pressed ? "border-ml-text" : "border-transparent"
      }`}
    />
  );
}
