import { useState } from "react";
import { LEVEL_THRESHOLDS, getLevelTitle } from "@shared/data/xpConfig";

type Tab = "howToPlay" | "levels";

const LEVEL_RANGES = LEVEL_THRESHOLDS.map((threshold, i) => ({
  level: i + 1,
  xpRequired: threshold,
  title: getLevelTitle(i + 1),
}));

// Group levels by title for a cleaner display
const LEVEL_GROUPS = LEVEL_RANGES.reduce<
  { title: string; minLevel: number; maxLevel: number; xpStart: number; xpEnd: number }[]
>((groups, { level, xpRequired, title }) => {
  const last = groups[groups.length - 1];
  if (last && last.title === title) {
    last.maxLevel = level;
    last.xpEnd = xpRequired;
  } else {
    groups.push({ title, minLevel: level, maxLevel: level, xpStart: xpRequired, xpEnd: xpRequired });
  }
  return groups;
}, []);

export const InstructionsModal = ({ handleToggleShowInstructions }: { handleToggleShowInstructions: () => void }) => {
  const [activeTab, setActiveTab] = useState<Tab>("howToPlay");

  return (
    <div className="modal-container" onClick={handleToggleShowInstructions}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {/* Tabs */}
        <div className="tab-text-container mb-4 items-center justify-center">
          <button
            className={`btn btn-text ${activeTab === "howToPlay" && "active"}`}
            style={{ width: "auto" }}
            onClick={() => setActiveTab("howToPlay")}
            aria-selected={activeTab === "howToPlay"}
          >
            How to Play
          </button>
          <button
            className={`btn btn-text ${activeTab === "levels" && "active"}`}
            style={{ width: "auto" }}
            onClick={() => setActiveTab("levels")}
            aria-selected={activeTab === "levels"}
          >
            Levels
          </button>
        </div>

        {activeTab === "howToPlay" ? (
          <div className="grid gap-2 text-left">
            <h3>Uh-oh! Your lunch got mixed up!</h3>
            <p>
              You need to build your <strong>Perfect Lunch</strong>, but you don't have the right foods yet.
            </p>
            <p>Everyone is looking for different foods.</p>
            <p>Explore to find what you need, and help each other by dropping items others can use.</p>
            <p>You can:</p>
            <ul className="p2 list-disc pl-5 grid gap-1">
              <li>Keep items</li>
              <li>Drop items for others</li>
              <li>Pick up items you need</li>
            </ul>
            <p>Work together to complete your Perfect Lunch!</p>
          </div>
        ) : (
          <div className="grid gap-2 text-left">
            <h3>Level Up!</h3>
            <p className="p2 text-muted">
              Earn XP by picking up items, dropping items for others, and completing meals. Here are the ranks you can
              achieve:
            </p>
            <div className="grid gap-1.5 mt-1" role="list" aria-label="Level progression">
              {LEVEL_GROUPS.map((group) => (
                <div
                  key={group.title}
                  role="listitem"
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center rounded-full border border-gray-900 w-7 h-7 text-xs flex-shrink-0">
                      {group.minLevel}
                    </span>
                    <span className="p2">{group.title}</span>
                  </div>
                  <span className="p3 text-muted">{group.xpStart.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn mt-2" onClick={handleToggleShowInstructions} aria-label="Close instructions">
          Got it!
        </button>
      </div>
    </div>
  );
};

export default InstructionsModal;
