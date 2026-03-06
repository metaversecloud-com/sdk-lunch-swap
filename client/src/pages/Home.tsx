import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import {
  PageContainer,
  BadgesView,
  BonusWheel,
  CompletionSummary,
  Leaderboard,
  MainGameView,
  NewDayWelcome,
} from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType, SET_BROWN_BAG, SET_DAILY_BUFF } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

type NewDayStep = "welcome" | "wheel-spin" | "done";
type ActiveTab = "game" | "badges" | "leaderboard";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, isNewDay, completedToday } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<NewDayStep>("welcome");
  const [activeTab, setActiveTab] = useState<ActiveTab>("game");
  const [isLoading, setIsLoading] = useState(true);

  const forceRefreshInventory = searchParams.get("forceRefreshInventory") === "true";

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  const getMainContent = () => {
    if (isNewDay && step !== "done") {
      if (step === "welcome") {
        return <NewDayWelcome setStep={setStep} />;
      } else if (step === "wheel-spin") {
        return (
          <BonusWheel
            onSkip={() => setStep("done")}
            onResult={({ buff, brownBag }) => {
              dispatch!({ type: SET_DAILY_BUFF, payload: { dailyBuff: buff.id } });
              if (brownBag) {
                dispatch!({ type: SET_BROWN_BAG, payload: { brownBag } });
              }
              setStep("done");
            }}
          />
        );
      }
    } else if (completedToday) {
      return <CompletionSummary />;
    }
    return <MainGameView />;
  };

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tab-container mb-4">
        <button className={`${activeTab === "game" ? "btn" : "btn btn-text"}`} onClick={() => setActiveTab("game")}>
          Game
        </button>
        <button className={`${activeTab === "badges" ? "btn" : "btn btn-text"}`} onClick={() => setActiveTab("badges")}>
          Badges
        </button>
        <button
          className={`${activeTab === "leaderboard" ? "btn" : "btn btn-text"}`}
          onClick={() => setActiveTab("leaderboard")}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === "game" ? getMainContent() : activeTab === "badges" ? <BadgesView /> : <Leaderboard />}
    </PageContainer>
  );
};

export default Home;
