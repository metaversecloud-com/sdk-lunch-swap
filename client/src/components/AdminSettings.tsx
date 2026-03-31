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

const InfoTooltip = ({ text }: { text: string }) => (
  <div className="tooltip ml-auto">
    <span className="tooltip-content p3 min-w-[100px]" style={{ left: "-30px" }}>
      {text}
    </span>
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-500 text-gray-500 text-xs"
      aria-hidden="true"
    >
      i
    </span>
  </div>
);

export const AdminSettings = () => {
  const state = useContext(GlobalStateContext);
  const dispatch = useContext(GlobalDispatchContext);

  const [dropRadiusMin, setDropRadiusMin] = useState(state.dropRadiusMin ?? 200);
  const [dropRadiusMax, setDropRadiusMax] = useState(state.dropRadiusMax ?? 2000);
  const [proximityRadius, setProximityRadius] = useState(state.proximityRadius ?? 300);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const { data } = await backendAPI.post("/admin/update-settings", {
        dropRadiusMin,
        dropRadiusMax,
        proximityRadius,
      });
      if (data.success) {
        dispatch!({
          type: SET_GAME_STATE,
          payload: {
            ...state,
            dropRadiusMin: data.settings.dropRadiusMin,
            dropRadiusMax: data.settings.dropRadiusMax,
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
      <div className="grid gap-2">
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
          <label htmlFor="drop-radius-min" className="p2 flex items-center">
            Drop Radius Min
            <InfoTooltip text="Minimum distance (in pixels) from the key asset where items can be dropped." />
          </label>
          <input
            id="drop-radius-min"
            type="number"
            className="input"
            min={0}
            max={10000}
            value={dropRadiusMin}
            onChange={(e) => setDropRadiusMin(Math.max(0, Math.min(10000, Number(e.target.value))))}
            disabled={isSaving}
          />
        </div>

        <div>
          <label htmlFor="drop-radius-max" className="p2 flex items-center">
            Drop Radius Max
            <InfoTooltip text="Maximum distance (in pixels) from the key asset where items can be dropped." />
          </label>
          <input
            id="drop-radius-max"
            type="number"
            className="input"
            min={0}
            max={10000}
            value={dropRadiusMax}
            onChange={(e) => setDropRadiusMax(Math.max(0, Math.min(10000, Number(e.target.value))))}
            disabled={isSaving}
          />
        </div>

        <div>
          <label htmlFor="proximity-radius" className="p2 flex items-center">
            Proximity Radius
            <InfoTooltip text="How close (in pixels) a player must be to an item for it to appear in their nearby list." />
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

        <button className="btn grid items-center gap-2 mt-1" disabled={isSaving} onClick={handleSave}>
          {isSaving && <Loading isSpinner={true} />}
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </section>
  );
};

export default AdminSettings;
