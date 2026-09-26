import { Warning } from "@phosphor-icons/react";

export default function ContextualSaveBar({
  showing = false,
  onSave,
  onCancel,
}) {
  if (!showing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-ml-raised border-b border-ml-line-2 shadow-ml-pop flex items-center justify-end px-4 z-[999]">
      <div className="absolute ml-4 left-0 md:left-1/2 transform md:-translate-x-1/2 flex items-center gap-x-2">
        <Warning size={18} className="text-ml-warn" />
        <p className="text-ml-text font-semibold text-[14px]">
          Unsaved Changes
        </p>
      </div>
      <div className="flex items-center gap-x-2">
        <button
          className="h-[34px] inline-flex items-center px-3 rounded-[9px] border border-ml-line-2 bg-ml-panel text-ml-text font-semibold text-[14px] cursor-pointer transition-colors duration-150 hover:border-ml-accent-line"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="h-[34px] inline-flex items-center px-3 rounded-[9px] border border-transparent bg-ml-accent-fill text-ml-on-accent font-semibold text-[14px] cursor-pointer transition-[filter] duration-150 hover:brightness-105"
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}
