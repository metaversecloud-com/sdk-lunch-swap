import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { Confetti, NutritionScoreDisplay, XpBreakdown, StreakCounter, Divider } from "@/components";

export const CompletionSummary = () => {
  const {
    completedToday,
    nutritionScore,
    nutritionBreakdown,
    superCombosFound,
    xp,
    level,
    currentStreak,
    longestStreak,
  } = useContext(GlobalStateContext);

  if (!completedToday) return null;

  const score = nutritionScore ?? 0;
  const combos = superCombosFound ?? [];
  const totalXp = xp ?? 0;
  const streak = currentStreak ?? 0;
  const best = longestStreak ?? 0;

  return (
    <section
      className="grid items-center text-center gap-6 p-5 rounded-2xl bg-gradient-to-b from-green-50 to-white border border-green-200 shadow-sm relative"
      aria-label="Meal completion summary"
    >
      <Confetti />
      <div>
        <h2>Meal Complete!</h2>
        {level !== undefined && <p>Level {level}</p>}
      </div>

      <NutritionScoreDisplay score={score} breakdown={nutritionBreakdown} superCombos={combos} />

      <Divider />

      <XpBreakdown totalXp={totalXp} nutritionScore={score} superCombosCount={combos.length} currentStreak={streak} />

      <Divider />

      <StreakCounter currentStreak={streak} longestStreak={best} />

      <Divider />

      <p className="p2">
        Done for today! <br />
        Come back tomorrow for a new meal.
      </p>
    </section>
  );
};
