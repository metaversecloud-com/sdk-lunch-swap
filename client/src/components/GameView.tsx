import { useContext, useState } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { CompletionSummary, MainGameView, NewDayWelcome } from "@/components";

export const GameView = () => {
  const { isNewDay, completedToday } = useContext(GlobalStateContext);
  const [dismissed, setDismissed] = useState(false);

  if (isNewDay && !dismissed) {
    return <NewDayWelcome onDismiss={() => setDismissed(true)} />;
  }

  if (completedToday) {
    return <CompletionSummary />;
  }

  return <MainGameView />;
};
