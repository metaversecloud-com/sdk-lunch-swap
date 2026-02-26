import { useEffect, useRef, useState } from "react";

export const ConfirmationModal = ({
  title,
  message,
  handleOnConfirm,
  handleToggleShowConfirmationModal,
}: {
  title: string;
  message: string;
  handleOnConfirm: () => void;
  handleToggleShowConfirmationModal: () => void;
}) => {
  const [areButtonsDisabled, setAreButtonsDisabled] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = "confirmation-modal-title";

  const onConfirm = () => {
    setAreButtonsDisabled(true);
    handleOnConfirm();
    handleToggleShowConfirmationModal();
  };

  // Focus trap and Escape handler
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleToggleShowConfirmationModal();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [handleToggleShowConfirmationModal]);

  return (
    <div className="modal-container" onClick={handleToggleShowConfirmationModal}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id={titleId}>{title}</h4>
        <p>{message}</p>
        <div className="actions">
          <button
            ref={cancelRef}
            id="close"
            className="btn btn-outline"
            onClick={handleToggleShowConfirmationModal}
            disabled={areButtonsDisabled}
            aria-label="No, cancel"
          >
            No
          </button>
          <button
            className="btn btn-danger-outline"
            onClick={onConfirm}
            disabled={areButtonsDisabled}
            aria-label="Yes, confirm"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
