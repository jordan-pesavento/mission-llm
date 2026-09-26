export function DefaultBadge({ title: _title }) {
  return (
    <>
      <span
        className="w-fit"
        data-tooltip-id="default-skill"
        data-tooltip-content="This skill is enabled by default and cannot be turned off."
      >
        <div className="flex items-center gap-x-1 w-fit rounded-full bg-ml-accent-soft px-2.5 py-0.5 text-sm font-medium text-ml-accent-text cursor-pointer">
          <div className="text-ml-accent-text text-[12px] leading-[15px]">
            Default
          </div>
        </div>
      </span>
    </>
  );
}
