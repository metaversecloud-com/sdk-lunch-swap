import { useContext, useState } from "react";

// components
import { ConfirmationModal, Loading } from "@/components";
import { AdminSettings } from "@/components/AdminSettings";
import { AdminStats } from "@/components/AdminStats";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

type ActionStatus = {
  type: "success" | "error";
  message: string;
} | null;

export const AdminView = () => {
  const dispatch = useContext(GlobalDispatchContext);

  // Action loading states
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSpawning, setIsSpawning] = useState(false);

  // Confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // Spawn input
  const [showSpawnInput, setShowSpawnInput] = useState(false);
  const [spawnCount, setSpawnCount] = useState(20);

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

  const handleSpawnItems = async () => {
    setIsSpawning(true);
    setActionStatus(null);
    try {
      const { data } = await backendAPI.post("/admin/spawn-items", { count: spawnCount });
      if (data.success) {
        setActionStatus({
          type: "success",
          message: `Spawned ${data.spawnedCount} item${data.spawnedCount !== 1 ? "s" : ""}.`,
        });
        setShowSpawnInput(false);
      }
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setActionStatus({
        type: "error",
        message: "Failed to spawn items. Please try again.",
      });
    } finally {
      setIsSpawning(false);
    }
  };

  const areButtonsDisabled = isRemoving || isSpawning;

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

          {/* Spawn Items */}
          {!showSpawnInput ? (
            <button
              className="btn"
              disabled={areButtonsDisabled}
              onClick={() => setShowSpawnInput(true)}
              aria-label="Spawn food items into the world"
            >
              Spawn Items
            </button>
          ) : (
            <div className="card my-1">
              <label htmlFor="spawn-count" className="p2">
                Number of items to spawn
              </label>
              <input
                id="spawn-count"
                type="number"
                className="input"
                min={1}
                max={50}
                value={spawnCount}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(50, Number(e.target.value)));
                  setSpawnCount(val);
                }}
                disabled={isSpawning}
                aria-describedby="spawn-count-hint"
              />
              <p id="spawn-count-hint" className="p2">
                Min 1, max 50
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn grid items-center gap-2"
                  disabled={areButtonsDisabled}
                  onClick={handleSpawnItems}
                  aria-label={`Spawn ${spawnCount} food items`}
                >
                  {isSpawning && <Loading isSpinner={true} />}
                  {isSpawning ? "Spawning..." : `Spawn ${spawnCount}`}
                </button>
                <button
                  className="btn btn-outline"
                  disabled={isSpawning}
                  onClick={() => setShowSpawnInput(false)}
                  aria-label="Cancel spawn"
                >
                  Cancel
                </button>
              </div>
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
