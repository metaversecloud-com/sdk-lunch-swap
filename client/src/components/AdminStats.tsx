import { useCallback, useContext, useEffect, useState } from "react";

// context
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";

// utils
import { backendAPI, setErrorMessage } from "@/utils";

export interface AdminStatsData {
  totalStartsToday: number;
  totalPlayersToday: number;
  totalCompletionsToday: number;
  totalPickups: number;
  totalDrops: number;
  totalMealSubmissions: number;
}

const statLabels: { key: keyof AdminStatsData; label: string }[] = [
  { key: "totalStartsToday", label: "Players Today" },
  { key: "totalCompletionsToday", label: "Completions Today" },
  { key: "totalPickups", label: "Total Pickups" },
  { key: "totalDrops", label: "Total Drops" },
];

const SkeletonCard = () => (
  <div className="rounded-lg bg-gray-100 p-2 animate-pulse" role="status" aria-label="Loading statistic">
    <div className="h-4 w-20 bg-gray-300 rounded mb-2" />
    <div className="h-6 w-12 bg-gray-300 rounded" />
  </div>
);

export const AdminStats = () => {
  const dispatch = useContext(GlobalDispatchContext);

  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    await backendAPI
      .get("/admin/stats")
      .then((response) => {
        const { stats } = response.data;
        setStats({
          totalStartsToday: stats.totalStartsToday,
          totalPlayersToday: stats.totalPlayersToday ?? 0,
          totalCompletionsToday: stats.totalCompletionsToday,
          totalPickups: stats.totalPickups,
          totalDrops: stats.totalDrops,
          totalMealSubmissions: stats.totalMealSubmissions ?? 0,
        });
      })
      .catch((error) => {
        setErrorMessage(dispatch, error as ErrorType);
        setStats(null);
      })
      .finally(() => {
        setIsLoadingStats(false);
      });
  }, [dispatch]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoadingStats) {
    return (
      <section aria-label="Game statistics loading">
        <h3>Game Stats</h3>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {statLabels.map(({ key }) => (
            <SkeletonCard key={key} />
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section aria-label="Game statistics unavailable">
        <h3>Game Stats</h3>
        <p className="p2 mt-2 text-gray-500">Unable to load stats.</p>
      </section>
    );
  }

  return (
    <section aria-label="Game statistics">
      <div className="grid grid-cols-2 gap-2">
        <h3 className="col-span-2">Game Stats</h3>
        {statLabels.map(({ key, label }) => (
          <div key={key} className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <p className="p2 text-gray-600 text-xs mb-1">{label}</p>
            <p className="p1 text-lg font-bold" aria-label={`${label}: ${stats[key]}`}>
              {stats[key] && stats[key].toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdminStats;
