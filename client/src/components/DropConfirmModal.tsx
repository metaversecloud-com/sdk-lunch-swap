import { useEffect, useRef } from "react";
import { BagItem, FOOD_GROUP_COLORS, RARITY_CONFIG } from "@shared/types/FoodItem";

interface DropConfirmModalProps {
  item: BagItem;
  onConfirm: () => void;
  onClose: () => void;
}

export const DropConfirmModal = ({ item, onConfirm, onClose }: DropConfirmModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = "drop-confirm-title";

  const borderColor = FOOD_GROUP_COLORS[item.foodGroup];
  const rarityConfig = RARITY_CONFIG[item.rarity];

  // Focus trap and Escape handler
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement;
    cancelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
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
  }, [onClose]);

  return (
    <div className="modal-container" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id={titleId} className="text-lg font-bold text-center text-gray-800 mb-3">
          Drop this item?
        </h4>

        <div className="flex items-center gap-3 p-3 rounded-xl border-2 bg-white mb-3" style={{ borderColor }}>
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: borderColor }}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="tooltip truncate">
              <span className="tooltip-content">{item.name}</span>
              <p className="font-semibold text-gray-800">{item.name}</p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 capitalize">{item.foodGroup}</span>
              <span
                className="p3 font-bold uppercase px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: rarityConfig.color }}
              >
                {rarityConfig.label}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 text-center mb-2">
          Drop <strong>{item.name}</strong> into the world?
        </p>
        <p className="text-xs text-gray-400 text-center mb-3">Other players can pick it up.</p>

        {item.matchesIdealMeal && (
          <div className="mb-4 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-center" role="alert">
            <p className="text-sm font-semibold text-amber-700">&#9888; This item is part of your ideal meal!</p>
          </div>
        )}

        <div className="actions">
          <button ref={cancelRef} className="btn btn-outline" onClick={onClose}>
            Keep It
          </button>
          <button
            className="btn btn-danger-outline"
            onClick={onConfirm}
            aria-label={`Drop ${item.name} into the world`}
          >
            Drop It
          </button>
        </div>
      </div>
    </div>
  );
};
