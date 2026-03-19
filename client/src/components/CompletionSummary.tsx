import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { Confetti, XpBreakdown, StreakCounter, Divider, MealTracker } from "@/components";

export const CompletionSummary = () => {
  const { completedToday, nutritionScore, superCombosFound, xp, currentStreak, longestStreak } =
    useContext(GlobalStateContext);

  if (!completedToday) return null;

  const score = nutritionScore ?? 0;
  const combos = superCombosFound ?? [];
  const totalXp = xp ?? 0;
  const streak = currentStreak ?? 0;
  const best = longestStreak ?? 0;

  return (
    <>
      <section
        className="grid items-center text-center gap-6 p-5 rounded-2xl bg-gradient-to-b from-green-50 to-white border border-green-200 shadow-sm relative"
        aria-label="Meal completion summary"
      >
        <Confetti />

        <MealTracker />

        <Divider />

        {/* Super combo callouts */}
        {combos && combos.length > 0 && (
          <div role="list" aria-label="Super combos found">
            <p className="uppercase pb-2 text-center">Super Combos</p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {combos.map((combo) => (
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
    </>
  );
};
