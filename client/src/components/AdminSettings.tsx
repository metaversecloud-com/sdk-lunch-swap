import { useContext, useState } from "react";

// components
import { Loading } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, SET_GAME_STATE } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

type SaveStatus = {
  type: "success" | "error";
  message: string;
} | null;

export const AdminSettings = () => {
  const state = useContext(GlobalStateContext);
  const dispatch = useContext(GlobalDispatchContext);

  const [spawnRadiusMin, setSpawnRadiusMin] = useState(state.spawnRadiusMin ?? 200);
  const [spawnRadiusMax, setSpawnRadiusMax] = useState(state.spawnRadiusMax ?? 2000);
  const [proximityRadius, setProximityRadius] = useState(state.proximityRadius ?? 300);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const { data } = await backendAPI.post("/admin/update-settings", {
        spawnRadiusMin,
        spawnRadiusMax,
        proximityRadius,
      });
      if (data.success) {
        dispatch!({
          type: SET_GAME_STATE,
          payload: {
            ...state,
            spawnRadiusMin: data.settings.spawnRadiusMin,
            spawnRadiusMax: data.settings.spawnRadiusMax,
            proximityRadius: data.settings.proximityRadius,
          },
        });
        setSaveStatus({ type: "success", message: "Settings saved." });
      }
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setSaveStatus({ type: "error", message: "Failed to save settings. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-label="World settings">
      <div className="grid gap-1">
        <h3>World Settings</h3>

        {saveStatus && (
          <div
            role="alert"
            className={`rounded-lg p-3 text-sm ${
              saveStatus.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {saveStatus.message}
          </div>
        )}

        <div>
          <label htmlFor="spawn-radius-min" className="p2">
            Spawn Radius Min
          </label>
          <input
            id="spawn-radius-min"
            type="number"
            className="input"
            min={0}
            max={10000}
            value={spawnRadiusMin}
            onChange={(e) => setSpawnRadiusMin(Math.max(0, Math.min(10000, Number(e.target.value))))}
            disabled={isSaving}
          />
        </div>

        <div>
          <label htmlFor="spawn-radius-max" className="p2">
            Spawn Radius Max
          </label>
          <input
            id="spawn-radius-max"
            type="number"
            className="input"
            min={0}
            max={10000}
            value={spawnRadiusMax}
            onChange={(e) => setSpawnRadiusMax(Math.max(0, Math.min(10000, Number(e.target.value))))}
            disabled={isSaving}
          />
        </div>

        <div>
          <label htmlFor="proximity-radius" className="p2">
            Proximity Radius
          </label>
          <input
            id="proximity-radius"
            type="number"
            className="input"
            min={0}
            max={10000}
            value={proximityRadius}
            onChange={(e) => setProximityRadius(Math.max(0, Math.min(10000, Number(e.target.value))))}
            disabled={isSaving}
          />
        </div>

        <button className="btn grid items-center gap-2 mt-2" disabled={isSaving} onClick={handleSave}>
          {isSaving && <Loading isSpinner={true} />}
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </section>
  );
};

export default AdminSettings;
