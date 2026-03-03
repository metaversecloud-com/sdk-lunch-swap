import { useContext, useState } from "react";
import { GlobalStateContext, GlobalDispatchContext } from "@/context/GlobalContext";
import { SET_DAILY_BUFF } from "@/context/types";
import { BonusWheel, BonusWheelPrompt, CompletionSummary, MainGameView, NewDayWelcome } from "@/components";

type NewDayStep = "welcome" | "wheel-prompt" | "wheel-spin" | "done";

export const GameView = () => {
  const { isNewDay, completedToday, hasRewardToken, dailyBuff } = useContext(GlobalStateContext);
  const dispatch = useContext(GlobalDispatchContext);
  const [step, setStep] = useState<NewDayStep>("welcome");

  if (isNewDay && step !== "done") {
    if (step === "welcome") {
      return (
        <NewDayWelcome
          onDismiss={() => {
            if (hasRewardToken && !dailyBuff) {
              setStep("wheel-prompt");
            } else {
              setStep("done");
            }
          }}
        />
      );
    }

    if (step === "wheel-prompt") {
      return <BonusWheelPrompt onSpin={() => setStep("wheel-spin")} onSkip={() => setStep("done")} />;
    }

    if (step === "wheel-spin") {
      return (
        <BonusWheel
          onResult={(buff) => {
            dispatch!({ type: SET_DAILY_BUFF, payload: { dailyBuff: buff.id } });
            setStep("done");
          }}
        />
      );
    }
  }

  if (completedToday) {
    return <CompletionSummary />;
  }

  return <MainGameView />;
};
