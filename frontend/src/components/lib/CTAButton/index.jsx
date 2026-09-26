// Primary settings action (Save changes, Add user, ...). Concept 1 primary
// button: 40px, 11px radius, accent fill. Callers position it with className.
// `type` and `form` pass through, so a submit button can sit outside its form.
export default function CTAButton({
  children,
  disabled = false,
  onClick,
  className = "",
  type,
  form,
}) {
  return (
    <button
      type={type}
      form={form}
      disabled={disabled}
      onClick={() => onClick?.()}
      className={`h-ctl-lg px-4 rounded-[11px] border border-transparent bg-ml-accent-fill text-ml-on-accent light:text-ml-on-accent text-[15px] font-semibold whitespace-nowrap w-fit shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_20px_-10px_var(--ml-accent)] transition-[filter] duration-150 hover:brightness-105 disabled:opacity-60 disabled:cursor-default ${className}`}
    >
      <div className="flex items-center justify-center gap-2">{children}</div>
    </button>
  );
}
