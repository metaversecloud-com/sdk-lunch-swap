import { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// components
import {
  PageContainer,
  BadgesView,
  CompletionSummary,
  Leaderboard,
  MainGameView,
} from "@/components";

// context
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

type ActiveTab = "game" | "badges" | "leaderboard";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, completedToday } = useContext(GlobalStateContext);
  const [searchParams] = useSearchParams();

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
    if (completedToday) {
      return <CompletionSummary />;
    }
    return <MainGameView />;
  };

  return (
    <PageContainer isLoading={isLoading}>
      <div className="tab-text-container mb-4 items-center justify-center">
        <button
          className={`btn btn-text ${activeTab === "game" && "active"}`}
          style={{ width: "auto" }}
          onClick={() => setActiveTab("game")}
        >
          Game
        </button>
        <button
          className={`btn btn-text ${activeTab === "badges" && "active"}`}
          style={{ width: "auto" }}
          onClick={() => setActiveTab("badges")}
        >
          Badges
        </button>
        <button
          className={`btn btn-text ${activeTab === "leaderboard" && "active"}`}
          style={{ width: "auto" }}
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
