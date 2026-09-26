import { middleTruncate } from "@/utils/directories";

export default function FolderSelectionPopup({ folders, onSelect, onClose }) {
  const handleFolderSelect = (folder) => {
    onSelect(folder);
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 p-1.5 bg-ml-raised border border-ml-line-2 rounded-[12px] shadow-ml-pop max-h-40 overflow-y-auto no-scroll">
      <ul>
        {folders.map((folder) => (
          <li
            key={folder.name}
            onClick={() => handleFolderSelect(folder)}
            className="px-3 py-2 text-[14px] text-ml-text-2 hover:bg-ml-raised-2 hover:text-ml-text rounded-[9px] cursor-pointer whitespace-nowrap"
          >
            {middleTruncate(folder.name, 25)}
          </li>
        ))}
      </ul>
    </div>
  );
}
