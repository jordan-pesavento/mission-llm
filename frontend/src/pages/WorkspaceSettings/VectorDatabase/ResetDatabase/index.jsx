import { useState } from "react";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";
import { useTranslation } from "react-i18next";

export default function ResetDatabase({ workspace }) {
  const [deleting, setDeleting] = useState(false);
  const { t } = useTranslation();
  const resetVectorDatabase = async () => {
    if (!window.confirm(`${t("vector-workspace.reset.confirm")}`)) return false;

    setDeleting(true);
    const success = await Workspace.wipeVectorDb(workspace.slug);
    if (!success) {
      showToast(
        t("vector-workspace.reset.error"),
        t("vector-workspace.common.error"),
        {
          clear: true,
        }
      );
      setDeleting(false);
      return;
    }

    showToast(
      t("vector-workspace.reset.success"),
      t("vector-workspace.common.success"),
      {
        clear: true,
      }
    );
    setDeleting(false);
  };

  return (
    <button
      disabled={deleting}
      onClick={resetVectorDatabase}
      type="button"
      className="w-60 h-[42px] transition-colors duration-150 border border-ml-bad/50 rounded-[12px] whitespace-nowrap text-[15px] font-semibold px-5 focus:z-10 bg-ml-bad-soft text-ml-text enabled:hover:bg-ml-bad enabled:hover:text-ml-ground enabled:hover:border-transparent disabled:animate-pulse disabled:opacity-60"
    >
      {deleting
        ? t("vector-workspace.reset.resetting")
        : t("vector-workspace.reset.reset")}
    </button>
  );
}
