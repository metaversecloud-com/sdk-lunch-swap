import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { NutritionScoreDisplay } from "@/components/NutritionScoreDisplay";
import { XpBreakdown } from "@/components/XpBreakdown";
import { StreakCounter } from "@/components/StreakCounter";

export const CompletionSummary = () => {
  const { completedToday, nutritionScore, superCombosFound, xp, level, currentStreak, longestStreak } =
    useContext(GlobalStateContext);

  if (!completedToday) return null;

  const score = nutritionScore ?? 0;
  const combos = superCombosFound ?? [];
  const totalXp = xp ?? 0;
  const streak = currentStreak ?? 0;
  const best = longestStreak ?? 0;

  return (
    <section
      className="flex flex-col items-center gap-6 p-5 rounded-2xl bg-gradient-to-b from-green-50 to-white border border-green-200 shadow-sm"
      aria-label="Meal completion summary"
    >
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-gray-800 mb-1">Meal Complete!</h2>
        {level !== undefined && <p className="text-sm font-medium text-gray-500">Level {level}</p>}
      </div>

      <NutritionScoreDisplay score={score} superCombos={combos} />

      <div className="w-full border-t border-gray-100" aria-hidden="true" />

      <XpBreakdown totalXp={totalXp} nutritionScore={score} superCombosCount={combos.length} currentStreak={streak} />

      <div className="w-full border-t border-gray-100" aria-hidden="true" />

      <StreakCounter currentStreak={streak} longestStreak={best} />

      <p className="text-sm text-gray-400 text-center mt-2">Done for today! Come back tomorrow for a new meal.</p>
    </section>
  );
};
