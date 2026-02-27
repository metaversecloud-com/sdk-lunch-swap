import { NutritionInfo } from "@shared/types/FoodItem";

interface NutritionPreviewProps {
  nutrition: NutritionInfo;
  name: string;
}

const NUTRITION_BARS = [
  { key: "protein", label: "Protein", color: "#E8564A", max: 30 },
  { key: "carbs", label: "Carbs", color: "#F0AD4E", max: 53 },
  { key: "fiber", label: "Fiber", color: "#5CB85C", max: 7 },
  { key: "vitamins", label: "Vitamins", color: "#9B59B6", max: 5 },
] as const;

export const NutritionPreview = ({ nutrition, name }: NutritionPreviewProps) => {
  const getValue = (key: (typeof NUTRITION_BARS)[number]["key"]): number => {
    if (key === "vitamins") {
      return nutrition.vitamins.length;
    }
    return nutrition[key];
  };

  return (
    <div className="flex flex-col gap-1 w-full" role="group" aria-label={`Nutrition info for ${name}`}>
      <p className="p3 uppercase tracking-wide">Nutrition</p>
      {NUTRITION_BARS.map(({ key, label, color, max }) => {
        const value = getValue(key);
        const percentage = Math.min(Math.round((value / max) * 100), 100);

        return (
          <div key={key} className="flex items-center gap-2">
            <span className="p3">{label}</span>
            <div
              className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden"
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${label}: ${percentage}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
