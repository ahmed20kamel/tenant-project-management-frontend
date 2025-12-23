// مكون موحد للحوارات
import { useEffect, useRef } from "react";
import Button from "./Button";

import { useTranslation } from "react-i18next";

export default function Dialog({
  title,
  desc,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
  danger = false,
  busy = false,
  open = false,
}) {
  const { t } = useTranslation();
  const defaultConfirmLabel = confirmLabel ?? t("confirm_default");
  const defaultCancelLabel = cancelLabel ?? t("cancel_default");
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const onBackdrop = (e) => {
    if (e.target === dialogRef.current && !busy) onClose?.();
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="dlg-backdrop"
      onMouseDown={onBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className="dlg">
        <div className="dlg-hd">
          <span id="dlg-title" className="dlg-title">
            {title}
          </span>
        </div>
        <div id="dlg-desc" className="dlg-body">
          {desc}
        </div>
        <div className="dlg-ft">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {defaultCancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {defaultConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

