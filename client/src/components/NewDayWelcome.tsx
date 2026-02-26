import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { BrownBag, IdealMealTracker } from "@/components";

interface NewDayWelcomeProps {
  onDismiss: () => void;
}

export const NewDayWelcome = ({ onDismiss }: NewDayWelcomeProps) => {
  const { currentStreak, level } = useContext(GlobalStateContext);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="text-center">
        <h2>New Day!</h2>
        <p className="p2">
          {currentStreak && currentStreak > 1
            ? `Day ${currentStreak} streak! Level ${level ?? 1}`
            : `Level ${level ?? 1} - Let's go!`}
        </p>
      </div>

      {/* Ideal meal preview */}
      <IdealMealTracker isPreview={true} />

      {/* Brown bag preview */}
      <BrownBag isPreview={true} />

      {/* Let's Go button */}
      <button
        className="w-full max-w-xs py-3 px-6 rounded-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 min-h-[44px]"
        onClick={onDismiss}
        aria-label="Dismiss welcome screen and start playing"
      >
        Let's Go!
      </button>
    </div>
  );
};
