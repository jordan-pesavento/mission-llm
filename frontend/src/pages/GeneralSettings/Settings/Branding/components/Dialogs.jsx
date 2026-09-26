import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker } from "react-router-dom";
import Modal, {
  ModalBody,
  ModalDangerButton,
  ModalFooter,
  ModalHeader,
  ModalSecondaryButton,
} from "@/components/lib/Modal";

/**
 * Confirm step for "Reset to defaults".
 */
export function ResetModal({ isOpen, busy, onCancel, onConfirm }) {
  const { t } = useTranslation();
  const [includeLinks, setIncludeLinks] = useState(false);

  useEffect(() => {
    if (isOpen) setIncludeLinks(false);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={busy ? undefined : onCancel} size="md">
      <ModalHeader
        title={t("customization.branding.reset.title")}
        onClose={busy ? undefined : onCancel}
      />
      <ModalBody>
        <p className="text-[15px] leading-[1.55] text-ml-text-2">
          {t("customization.branding.reset.body")}
        </p>
        <label className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-ml-text cursor-pointer">
          <input
            type="checkbox"
            checked={includeLinks}
            onChange={(e) => setIncludeLinks(e.target.checked)}
            className="mt-[3px] w-[18px] h-[18px] shrink-0 accent-[var(--ml-accent)] cursor-pointer"
          />
          {t("customization.branding.reset.include-links")}
        </label>
      </ModalBody>
      <ModalFooter>
        <ModalSecondaryButton type="button" onClick={onCancel} disabled={busy}>
          {t("customization.branding.reset.cancel")}
        </ModalSecondaryButton>
        <ModalDangerButton
          type="button"
          disabled={busy}
          onClick={() => onConfirm({ includeLinks })}
        >
          {busy
            ? t("customization.branding.reset.working")
            : t("customization.branding.reset.confirm")}
        </ModalDangerButton>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Warns before leaving with unsaved changes: in-app navigation shows a confirm
 * modal, closing or reloading the tab shows the browser's own prompt. Switching
 * tabs on this page (?tab=) is not blocked.
 */
export function UnsavedChangesGuard({ when }) {
  const { t } = useTranslation();
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (!when) return;
    function onBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  useEffect(() => {
    if (blocker.state === "blocked" && !when) blocker.proceed();
  }, [blocker.state, when]);

  const open = blocker.state === "blocked";
  return (
    <Modal isOpen={open} onClose={() => blocker.reset?.()} size="md">
      <ModalHeader
        title={t("customization.branding.leave.title")}
        onClose={() => blocker.reset?.()}
      />
      <ModalBody>
        <p className="text-[15px] leading-[1.55] text-ml-text-2">
          {t("customization.branding.leave.body")}
        </p>
      </ModalBody>
      <ModalFooter>
        <ModalSecondaryButton type="button" onClick={() => blocker.reset?.()}>
          {t("customization.branding.leave.stay")}
        </ModalSecondaryButton>
        <ModalDangerButton type="button" onClick={() => blocker.proceed?.()}>
          {t("customization.branding.leave.discard")}
        </ModalDangerButton>
      </ModalFooter>
    </Modal>
  );
}
