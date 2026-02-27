import { useMemo } from "react";

interface NutritionScoreDisplayProps {
  score: number;
  breakdown?: {
    proteinScore: number;
    fiberScore: number;
    vitaminDiversity: number;
    balanceScore: number;
  };
  superCombos?: string[];
}

const QUADRANTS = [
  { key: "proteinScore", label: "Protein", color: "#E8564A" },
  { key: "fiberScore", label: "Fiber", color: "#5CB85C" },
  { key: "vitaminDiversity", label: "Vitamins", color: "#9B59B6" },
  { key: "balanceScore", label: "Balance", color: "#4A90D9" },
] as const;

function getLetterGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: "A+", color: "#16a34a" };
  if (score >= 80) return { grade: "A", color: "#22c55e" };
  if (score >= 70) return { grade: "B+", color: "#84cc16" };
  if (score >= 60) return { grade: "B", color: "#eab308" };
  if (score >= 50) return { grade: "C+", color: "#f97316" };
  return { grade: "C", color: "#ef4444" };
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#eab308";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

export const NutritionScoreDisplay = ({ score, breakdown, superCombos }: NutritionScoreDisplayProps) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const { grade, color: gradeColor } = useMemo(() => getLetterGrade(clampedScore), [clampedScore]);
  const scoreColor = useMemo(() => getScoreColor(clampedScore), [clampedScore]);

  // SVG circle progress ring values
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="grid items-center gap-4">
      {/* Circular score ring */}
      <div
        className="relative w-36 h-36 m-auto"
        role="img"
        aria-label={`Nutrition score: ${clampedScore} out of 100, grade ${grade}`}
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" role="img" aria-hidden="true">
          {/* Background track */}
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          {/* Progress arc */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <h2><b>{clampedScore}</b></h2>
          <h3 style={{ color: gradeColor }}>
            <b>{grade}</b>
          </h3>
        </div>
      </div>

      {/* 4-quadrant breakdown */}
      {breakdown && (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Score breakdown by category">
          {QUADRANTS.map(({ key, label, color }) => {
            const value = breakdown[key];
            const pct = Math.round((value / 25) * 100);

            return (
              <div
                key={key}
                className="grid items-center gap-1 p-2.5 rounded-xl bg-gray-50 border border-gray-100"
              >
                <p className="p2 uppercase">{label}</p>
                <div
                  className="w-full h-2.5 rounded-full bg-gray-200 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={25}
                  aria-label={`${label}: ${value} out of 25`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <p className="p2">
                  {value}
                  <span className="text-muted">/25</span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Super combo callouts */}
      {superCombos && superCombos.length > 0 && (
        <div role="list" aria-label="Super combos found">
          <p className="uppercase pb-2 text-center">Super Combos</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {superCombos.map((combo) => (
              <span
                key={combo}
                role="listitem"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs border border-purple-200"
              >
                <span aria-hidden="true">&#9889;</span>
                {combo}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
