import { useState, useEffect, useRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import Preloader from "@/components/Preloader";
import debounce from "lodash.debounce";
import Workspace from "@/models/workspace";
import WorkspaceTile from "@/components/WorkspaceTile";

const DEFAULT_SEARCH_RESULTS = {
  workspaces: [],
  threads: [],
};

const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().indexOf("MAC") >= 0;
// Ctrl+K already opens the API keys settings, so search uses Ctrl+/ (the
// rail listens for it in Sidebar/index.jsx).
export const SEARCH_SHORTCUT_LABEL = isMac ? "⌘ /" : "Ctrl /";

const SEARCH_RESULT_SELECTED = "search-result-selected";
export default function SearchBox({ inputRef = null }) {
  const { t } = useTranslation();
  const localRef = useRef(null);
  const searchRef = inputRef || localRef;
  const [searchTerm, setSearchTerm] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(DEFAULT_SEARCH_RESULTS);
  const handleSearch = debounce(handleSearchDebounced, 500);

  async function handleSearchDebounced(e) {
    try {
      const searchValue = e.target.value;
      setSearchTerm(searchValue);
      setLoading(true);
      const searchResults =
        await Workspace.searchWorkspaceOrThread(searchValue);
      setSearchResults(searchResults);
    } catch (error) {
      console.error(error);
      setSearchResults(DEFAULT_SEARCH_RESULTS);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (searchRef.current) searchRef.current.value = "";
    setSearchTerm("");
    setLoading(false);
    setSearchResults(DEFAULT_SEARCH_RESULTS);
  }

  useEffect(() => {
    window.addEventListener(SEARCH_RESULT_SELECTED, handleReset);
    return () =>
      window.removeEventListener(SEARCH_RESULT_SELECTED, handleReset);
  }, []);

  const showShortcut = !focused && !searchTerm;
  return (
    <div className="relative w-full shrink-0">
      <div className="relative h-[42px] w-full">
        <MagnifyingGlass
          size={18}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ml-text-3 pointer-events-none"
        />
        <input
          ref={searchRef}
          type="search"
          placeholder={t("common.search")}
          aria-label={t("common.search")}
          aria-keyshortcuts={isMac ? "Meta+/" : "Control+/"}
          onChange={handleSearch}
          onReset={handleReset}
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            handleReset();
            e.currentTarget.blur();
          }}
          className={`search-input w-full h-full rounded-[12px] border border-ml-line bg-ml-panel pl-[40px] ${showShortcut ? "pr-[76px]" : "pr-3"} text-[15px] text-ml-text placeholder:text-ml-text-3 outline-none transition-[border-color,box-shadow] duration-150 focus:border-ml-accent-line focus:shadow-[0_0_0_4px_var(--ml-accent-soft)]`}
        />
        {showShortcut && (
          <span
            aria-hidden="true"
            className="ml-kbd absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            {SEARCH_SHORTCUT_LABEL}
          </span>
        )}
      </div>
      <SearchResults
        searchResults={searchResults}
        searchTerm={searchTerm}
        loading={loading}
      />
    </div>
  );
}

function SearchResultWrapper({ children }) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 flex flex-col gap-y-4 max-h-[60vh] overflow-y-auto p-2 rounded-[12px] bg-ml-raised border border-ml-line-2 shadow-ml-pop">
      {children}
    </div>
  );
}

function SearchResults({ searchResults, searchTerm, loading }) {
  if (!searchTerm || searchTerm.length < 3) return null;
  if (loading)
    return (
      <SearchResultWrapper>
        <div className="flex flex-col gap-y-2 h-[160px] justify-center items-center">
          <Preloader size={5} />
          <p className="text-ml-text-2 text-[13px] font-semibold text-center">
            Searching for "{searchTerm}"
          </p>
        </div>
      </SearchResultWrapper>
    );

  if (
    searchResults.workspaces.length === 0 &&
    searchResults.threads.length === 0
  ) {
    return (
      <SearchResultWrapper>
        <div className="flex flex-col gap-y-1 h-[120px] justify-center items-center text-center">
          <p className="text-ml-text-2 text-[13px] font-semibold">
            No results found for
          </p>
          <p className="text-ml-text text-[15px] font-semibold break-all">
            "{searchTerm}"
          </p>
        </div>
      </SearchResultWrapper>
    );
  }

  return (
    <SearchResultWrapper>
      <SearchResultCategory
        name="Workspaces"
        items={searchResults.workspaces?.map((workspace) => ({
          id: workspace.slug,
          to: paths.workspace.chat(workspace.slug),
          name: workspace.name,
          workspace,
        }))}
      />
      <SearchResultCategory
        name="Threads"
        items={searchResults.threads?.map((thread) => ({
          id: thread.slug,
          to: paths.workspace.thread(thread.workspace.slug, thread.slug),
          name: thread.name,
          hint: thread.workspace.name,
        }))}
      />
    </SearchResultWrapper>
  );
}

function SearchResultCategory({ items, name }) {
  if (!items?.length) return null;
  return (
    <div className="flex flex-col gap-y-1">
      <p className="text-ml-text-3 text-[13px] font-semibold px-2 pt-1">
        {name}
      </p>
      <div className="flex flex-col gap-y-0.5">
        {items.map((item) => (
          <SearchResultItem
            key={item.id}
            to={item.to}
            name={item.name}
            hint={item.hint}
            workspace={item.workspace}
          />
        ))}
      </div>
    </div>
  );
}

function SearchResultItem({ to, name, hint, workspace = null }) {
  return (
    <Link
      to={to}
      onClick={() => window.dispatchEvent(new Event(SEARCH_RESULT_SELECTED))}
      className="flex items-center gap-x-2.5 min-h-[38px] px-2.5 py-1 rounded-[9px] hover:bg-ml-raised-2 transition-colors duration-150"
    >
      {workspace && (
        <WorkspaceTile
          workspace={workspace}
          size={26}
          selected={false}
          aria-hidden="true"
        />
      )}
      <span className="flex flex-col justify-center min-w-0">
        <span className="text-ml-text text-[15px] truncate">{name}</span>
        {hint && (
          <span className="text-ml-text-3 text-[13px] truncate">{hint}</span>
        )}
      </span>
    </Link>
  );
}
