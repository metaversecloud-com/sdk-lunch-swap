import { useContext, useState } from "react";

// components
import { ConfirmationModal, Loading } from "@/components";
import { AdminSettings } from "@/components/AdminSettings";
import { AdminStats } from "@/components/AdminStats";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, FoodItemInWorld, SET_FOOD_ITEMS_IN_WORLD } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

type ActionStatus = {
  type: "success" | "error";
  message: string;
} | null;

export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { foodItemsInWorld } = useContext(GlobalStateContext);

  // Action loading states
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDropping, setIsDropping] = useState(false);

  // Confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Drop input
  const [showDropInput, setShowDropInput] = useState(false);
  const [dropCount, setDropCount] = useState(20);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Status message
  const [actionStatus, setActionStatus] = useState<ActionStatus>();

  const handleToggleShowConfirmationModal = () => {
    setShowConfirmationModal((prev) => !prev);
  };

  const handleRemoveAllItems = async () => {
    setIsRemoving(true);
    setActionStatus(null);
    try {
      const { data } = await backendAPI.post("/admin/remove-all-items");
      if (data.success) {
        setActionStatus({
          type: "success",
          message: `Removed ${data.removedCount} item${data.removedCount !== 1 ? "s" : ""}.`,
        });

        if (data.foodItemsInWorld && dispatch) {
          dispatch({ type: SET_FOOD_ITEMS_IN_WORLD, payload: { foodItemsInWorld: data.foodItemsInWorld } });
        }
      }
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setActionStatus({
        type: "error",
        message: "Failed to remove items. Please try again.",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDropItems = async (itemIds?: string[]) => {
    setIsDropping(true);
    setActionStatus(null);
    try {
      const body: { count?: number; itemIds?: string[] } = itemIds ? { itemIds } : { count: dropCount };
      const { data } = await backendAPI.post("/admin/drop-items", body);
      if (data.success) {
        setActionStatus({
          type: "success",
          message: `Dropped ${data.droppedCount} item${data.droppedCount !== 1 ? "s" : ""}.`,
        });
        setShowDropInput(false);
        setSelectedItemIds(new Set());

        if (data.foodItemsInWorld && dispatch) {
          dispatch({ type: SET_FOOD_ITEMS_IN_WORLD, payload: { foodItemsInWorld: data.foodItemsInWorld } });
        }
      }
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setActionStatus({
        type: "error",
        message: "Failed to drop items. Please try again.",
      });
    } finally {
      setIsDropping(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const areButtonsDisabled = isRemoving || isDropping;

  return (
    <div className="grid gap-6">
      {/* Stats Section */}
      <AdminStats />

      {/* Settings Section */}
      <AdminSettings />

      {/* Actions Section */}
      <section aria-label="Admin actions">
        <div className="grid gap-2">
          <h3>Actions</h3>

          {/* Status message */}
          {actionStatus && (
            <div
              role="alert"
              className={`rounded-lg p-3 text-sm ${
                actionStatus.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {actionStatus.message}
            </div>
          )}

          {/* Drop Items */}
          {!showDropInput ? (
            <button
              className="btn"
              disabled={areButtonsDisabled}
              onClick={() => setShowDropInput(true)}
              aria-label="Drop food items into the world"
            >
              Drop Items
            </button>
          ) : (
            <div className="card my-1">
              {/* Food Items List */}
              {foodItemsInWorld && foodItemsInWorld.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="p2  flex-shrink-0">Select specific items to drop</p>
                    {selectedItemIds.size > 0 && (
                      <div
                        className="p3 flex-shrink-1 text-right cursor-pointer"
                        onClick={() => setSelectedItemIds(new Set())}
                        aria-label="Clear selection"
                      >
                        Clear ({selectedItemIds.size})
                      </div>
                    )}
                  </div>
                  <div
                    className="border border-gray-200 rounded-lg overflow-y-auto"
                    style={{ maxHeight: "200px" }}
                    role="listbox"
                    aria-label="Food items in world"
                    aria-multiselectable="true"
                  >
                    {foodItemsInWorld.map((item: FoodItemInWorld) => {
                      const isSelected = selectedItemIds.has(item.itemId);
                      // const rarityConf = RARITY_CONFIG[item.rarity as keyof typeof RARITY_CONFIG];
                      // const groupColor = FOOD_GROUP_COLORS[item.foodGroup as keyof typeof FOOD_GROUP_COLORS];
                      return (
                        <button
                          key={item.itemId}
                          role="option"
                          aria-selected={isSelected}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left border-b border-gray-100 last:border-b-0 transition-colors ${
                            isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                          }`}
                          onClick={() => toggleItemSelection(item.itemId)}
                          disabled={isDropping}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              className="input-checkbox flex-shrink-0"
                              checked={isSelected}
                              readOnly
                              tabIndex={-1}
                              aria-hidden="true"
                            />
                            <div className="tooltip truncate">
                              <span className="tooltip-content p3">{item.name}</span>
                              <span className="p2">{item.name}</span>
                            </div>
                            {/* <span
                              className="p3 uppercase px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                              style={{ backgroundColor: groupColor || "#6B7280", fontSize: "0.6rem" }}
                            >
                              {item.foodGroup}
                            </span>
                            <span
                              className="p3 uppercase px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                              style={{ backgroundColor: rarityConf?.color || "#8E8E93", fontSize: "0.6rem" }}
                            >
                              {rarityConf?.label || item.rarity}
                            </span> */}
                          </div>
                          <span className="p3 text-gray-500 flex-shrink-0 ml-2">{item.countInWorld} in world</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Drop Selected or Random */}
              {selectedItemIds.size > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn grid items-center gap-2"
                    disabled={areButtonsDisabled}
                    onClick={() => handleDropItems(Array.from(selectedItemIds))}
                    aria-label={`Drop ${selectedItemIds.size} selected items`}
                  >
                    {isDropping && <Loading isSpinner={true} />}
                    {isDropping ? "Dropping..." : `Drop ${selectedItemIds.size}`}
                  </button>
                  <button
                    className="btn btn-outline"
                    disabled={isDropping}
                    onClick={() => setShowDropInput(false)}
                    aria-label="Cancel drop"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="drop-count" className="p2">
                    Or drop random items (max 60)
                  </label>
                  <input
                    id="drop-count"
                    type="number"
                    className="input"
                    min={1}
                    max={60}
                    value={dropCount}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(60, Number(e.target.value)));
                      setDropCount(val);
                    }}
                    disabled={isDropping}
                    aria-describedby="drop-count-hint"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="btn grid items-center gap-2"
                      disabled={areButtonsDisabled}
                      onClick={() => handleDropItems()}
                      aria-label={`Drop ${dropCount} random food items`}
                    >
                      {isDropping && <Loading isSpinner={true} />}
                      {isDropping ? "Dropping..." : `Drop ${dropCount}`}
                    </button>
                    <button
                      className="btn btn-outline"
                      disabled={isDropping}
                      onClick={() => setShowDropInput(false)}
                      aria-label="Cancel drop"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Remove All Items */}
          <button
            className="btn btn-danger grid items-center gap-2"
            disabled={areButtonsDisabled}
            onClick={handleToggleShowConfirmationModal}
            aria-label="Remove all food items from the world"
          >
            {isRemoving && <Loading isSpinner={true} />}
            {isRemoving ? "Removing..." : "Remove All Items"}
          </button>
        </div>
      </section>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <ConfirmationModal
          title="Remove All Food Items"
          message="Are you sure you want to remove all food items from the world? This action cannot be undone."
          handleOnConfirm={handleRemoveAllItems}
          handleToggleShowConfirmationModal={handleToggleShowConfirmationModal}
        />
      )}
    </div>
  );
};

export default AdminView;
