import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { LeaderboardEntry } from "@shared/types/DataObjects";

export const Leaderboard = () => {
  const { leaderboard } = useContext(GlobalStateContext);

  if (!leaderboard || leaderboard.length === 0) {
    return <p className="p2 text-center">No results yet. Complete a meal to join the leaderboard!</p>;
  }

  return (
    <div className="items-center">
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th className="h5">Name</th>
            <th className="h5">Meals</th>
            <th className="h5">Streak</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry: LeaderboardEntry, index: number) => (
            <tr key={entry.profileId}>
              <td className="p2">{index + 1}</td>
              <td className="p2">{entry.name}</td>
              <td className="p2">{entry.totalMealsCompleted}</td>
              <td className="p2">{entry.longestStreak}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
