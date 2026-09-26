import { ICON_COMPONENTS } from "@/components/Footer";
import React, { useEffect, useRef, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { SET_FIELD, SET_BTN_PRIMARY } from "@/components/SettingsPage";

export default function NewIconForm({ icon, url, onSave, onRemove }) {
  const [selectedIcon, setSelectedIcon] = useState(icon || "Plus");
  const [selectedUrl, setSelectedUrl] = useState(url || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedIcon(icon || "Plus");
    setSelectedUrl(url || "");
    setIsEdited(false);
  }, [icon, url]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIcon !== "Plus" && selectedUrl) {
      onSave(selectedIcon, selectedUrl);
      setIsEdited(false);
    }
  };

  const handleRemove = () => {
    onRemove();
    setSelectedIcon("Plus");
    setSelectedUrl("");
    setIsEdited(false);
  };

  const handleIconChange = (iconName) => {
    setSelectedIcon(iconName);
    setIsDropdownOpen(false);
    setIsEdited(true);
  };

  const handleUrlChange = (e) => {
    setSelectedUrl(e.target.value);
    setIsEdited(true);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-x-2.5">
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          aria-label="Choose icon"
          aria-haspopup="menu"
          aria-expanded={isDropdownOpen}
          className="w-field h-field grid place-items-center rounded-[12px] border border-ml-line-2 bg-ml-panel cursor-pointer transition-colors duration-150 hover:border-ml-accent-line"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          {React.createElement(ICON_COMPONENTS[selectedIcon] || Plus, {
            className: "h-5 w-5",
            weight: selectedIcon === "Plus" ? "bold" : "fill",
            color: "var(--theme-sidebar-footer-icon-fill)",
          })}
        </button>
        {isDropdownOpen && (
          <div
            role="menu"
            className="absolute z-10 mt-2 grid grid-cols-4 gap-1 p-1.5 w-[188px] max-h-[140px] overflow-y-auto rounded-[12px] border border-ml-line-2 bg-ml-raised shadow-ml-pop"
          >
            {Object.keys(ICON_COMPONENTS).map((iconName) => (
              <button
                key={iconName}
                type="button"
                role="menuitem"
                aria-label={iconName}
                className="w-10 h-10 grid place-items-center rounded-[9px] border border-transparent cursor-pointer transition-colors duration-150 hover:bg-ml-raised-2 hover:border-ml-line"
                onClick={() => handleIconChange(iconName)}
              >
                {React.createElement(ICON_COMPONENTS[iconName], {
                  className: "h-5 w-5",
                  weight: "fill",
                  color: "var(--theme-sidebar-footer-icon-fill)",
                })}
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="url"
        value={selectedUrl}
        onChange={handleUrlChange}
        placeholder="https://example.com"
        aria-label="Link"
        className={`${SET_FIELD} flex-1 min-w-0`}
        required
      />
      {selectedIcon !== "Plus" && (
        <>
          {isEdited ? (
            <button type="submit" className={SET_BTN_PRIMARY}>
              Save
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove"
              className="w-field h-field shrink-0 grid place-items-center rounded-[12px] border border-ml-line-2 bg-ml-raised text-ml-text-2 cursor-pointer transition-colors duration-150 hover:border-ml-bad hover:text-ml-bad"
            >
              <X size={18} />
            </button>
          )}
        </>
      )}
    </form>
  );
}
