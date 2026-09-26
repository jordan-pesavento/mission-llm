/**
 * Shared pieces for instance settings pages (concept 1): the page head, the
 * two-column settings row, and the field and button styles. Colors come from
 * the --ml-* tokens so both themes follow automatically.
 */

// 44px text field on the panel fill, accent border and soft ring on focus.
export const SET_FIELD =
  "block w-full h-field px-[14px] rounded-[12px] border border-ml-line-2 bg-ml-panel text-ml-text text-[16px] font-normal placeholder:text-ml-text-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-ml-accent-line focus:shadow-[0_0_0_4px_var(--ml-accent-soft)]";

// 42px secondary button (Reset, Clear).
export const SET_BTN =
  "h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-[12px] border border-ml-line-2 bg-ml-raised text-ml-text font-semibold text-[15px] whitespace-nowrap cursor-pointer transition-colors duration-150 hover:border-ml-accent-line disabled:opacity-60 disabled:cursor-default";

// 42px primary button (Save).
export const SET_BTN_PRIMARY =
  "h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-[12px] border border-transparent bg-ml-accent-fill text-ml-on-accent font-semibold text-[15px] whitespace-nowrap cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter] duration-150 hover:brightness-110 disabled:opacity-60 disabled:cursor-default";

// 34px small button used inside cards (Replace, Remove).
export const SET_SBTN =
  "h-[34px] inline-flex items-center gap-1.5 px-[11px] rounded-[9px] border border-ml-line-2 bg-ml-raised text-ml-text font-semibold text-[14px] whitespace-nowrap cursor-pointer transition-colors duration-150 hover:border-ml-accent-line";

/**
 * Page title, description and optional actions on the right.
 */
export function SettingsPageHead({ title, description, actions = null }) {
  return (
    <div
      data-settings-head
      className="flex items-center flex-wrap gap-4 pt-[22px] pb-4 border-b border-ml-line"
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
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      )}
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
 * Label above a field inside a settings row.
 */
export function SettingsField({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-[14.5px] font-semibold text-ml-text-2">
      {label}
      {children}
    </label>
  );
}
