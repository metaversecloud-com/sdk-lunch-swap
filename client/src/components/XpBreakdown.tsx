import { useMemo } from "react";
import { XP_ACTIONS } from "@shared/data/xpConfig";

interface XpBreakdownProps {
  totalXp: number;
  nutritionScore?: number;
  superCombosCount?: number;
  currentStreak?: number;
}

interface LineItem {
  label: string;
  value: number;
  highlight?: boolean;
}

export const XpBreakdown = ({ totalXp, nutritionScore, superCombosCount, currentStreak }: XpBreakdownProps) => {
  const lineItems = useMemo<LineItem[]>(() => {
    const items: LineItem[] = [{ label: "Base completion", value: XP_ACTIONS.SUBMIT_MEAL }];

    // if (nutritionScore !== undefined && nutritionScore >= 80) {
    //   items.push({ label: "Nutrition bonus", value: XP_ACTIONS.BALANCED_MEAL_BONUS, highlight: true });
    // }

    if (superCombosCount !== undefined && superCombosCount > 0) {
      items.push({
        label: `Super Combos (${superCombosCount})`,
        value: XP_ACTIONS.SUPER_COMBO * superCombosCount,
        highlight: true,
      });
    }

    if (currentStreak !== undefined && currentStreak > 0) {
      const streakXp = Math.min(currentStreak * XP_ACTIONS.STREAK_PER_WEEK, XP_ACTIONS.STREAK_CAP);
      items.push({ label: `Streak bonus (${currentStreak}w)`, value: streakXp });
    }

    return items;
  }, [nutritionScore, superCombosCount, currentStreak]);

  const itemTotal = lineItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <div role="region" aria-label="XP breakdown">
      <h3 className="uppercase pb-3">XP Earned</h3>

      <div className="flex flex-col gap-1.5 mb-3" role="list" aria-label="XP line items">
        {lineItems.map((item) => (
          <div
            key={item.label}
            role="listitem"
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm
              ${item.highlight ? "bg-yellow-50 border border-yellow-200" : "bg-white border border-gray-100"}`}
          >
            <span className={`${item.highlight ? "text-yellow-800" : "text-gray-600"}`}>{item.label}</span>
            <span className={`${item.highlight ? "text-yellow-700" : "text-gray-800"}`}>+{item.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-50 border-2 border-indigo-200">
        <span className="text-indigo-800">Total</span>
        <span className="text-lg text-indigo-700">+{itemTotal} XP</span>
      </div>

      <p className="text-muted pt-2">Lifetime XP: {totalXp.toLocaleString()}</p>
    </div>
  );
};
