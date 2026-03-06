import { LeaderboardEntry, KeyAssetData } from "@shared/types/DataObjects.js";
import { IKeyAsset } from "../types/index.js";

/**
 * Parse pipe-delimited leaderboard data from a key asset into sorted entries.
 * Format: "displayName|totalMealsCompleted|longestStreak"
 */
export const parseLeaderboard = (keyAsset: IKeyAsset): LeaderboardEntry[] => {
  const leaderboardData = (keyAsset.dataObject as KeyAssetData)?.leaderboard;
  if (!leaderboardData) return [];

  const entries: LeaderboardEntry[] = [];
  for (const pid in leaderboardData) {
    const [name, meals, streak] = leaderboardData[pid].split("|");
    entries.push({
      profileId: pid,
      name,
      totalMealsCompleted: parseInt(meals) || 0,
      longestStreak: parseInt(streak) || 0,
    });
  }

  entries.sort((a, b) => b.totalMealsCompleted - a.totalMealsCompleted || b.longestStreak - a.longestStreak);
  return entries;
};

/**
 * Update a visitor's leaderboard entry on the key asset.
 */
export const updateLeaderboard = async (
  keyAsset: IKeyAsset,
  profileId: string,
  displayName: string,
  totalMealsCompleted: number,
  longestStreak: number,
): Promise<void> => {
  const resultString = `${displayName}|${totalMealsCompleted}|${longestStreak}`;
  if ((keyAsset.dataObject as KeyAssetData)?.leaderboard) {
    await keyAsset.updateDataObject({ [`leaderboard.${profileId}`]: resultString }, {});
  } else {
    await keyAsset.updateDataObject({ leaderboard: { [profileId]: resultString } }, {});
  }
};
