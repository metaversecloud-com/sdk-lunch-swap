import { useContext, useState } from "react";

// components
import { BrownBag, IdealMealTracker, PageFooter } from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";
interface NewDayWelcomeProps {
  setStep: (step: "welcome" | "wheel-spin" | "done") => void;
}

export const NewDayWelcome = ({ setStep }: NewDayWelcomeProps) => {
  const dispatch = useContext(GlobalDispatchContext);
  const { currentStreak, level, hasRewardToken, dailyBuff } = useContext(GlobalStateContext);

  const [areBtnsDisabled, setAreBtnsDisabled] = useState(false);

  const onStart = async () => {
    setAreBtnsDisabled(true);
    await backendAPI
      .post("/start")
      .catch((error) => {
        setErrorMessage(dispatch, error as ErrorType);
      })
      .finally(() => {
        if (hasRewardToken && !dailyBuff) setStep("wheel-spin");
        else setStep("done");
        setAreBtnsDisabled(false);
      });
  };

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
      <PageFooter>
        <button
          className="w-full max-w-xs py-3 px-6 rounded-2xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 active:from-green-700 active:to-emerald-800 shadow-lg hover:shadow-xl transition-all duration-200 min-h-[44px]"
          onClick={onStart}
          disabled={areBtnsDisabled}
          aria-label="Start playing"
        >
          Let's Go!
        </button>
      </PageFooter>
    </div>
  );
};
