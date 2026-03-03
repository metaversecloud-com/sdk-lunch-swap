import {
  ActionType,
  InitialState,
  SET_ERROR,
  SET_GAME_STATE,
  SET_HAS_INTERACTIVE_PARAMS,
  SET_BROWN_BAG,
  SET_IDEAL_MEAL,
  SET_NEARBY_ITEMS,
  SET_COMPLETED,
  SET_DAILY_BUFF,
} from "./types";

const globalReducer = (state: InitialState, action: ActionType): InitialState => {
  const { type, payload } = action;
  switch (type) {
    case SET_HAS_INTERACTIVE_PARAMS:
      return {
        ...state,
        hasInteractiveParams: true,
      };
    case SET_GAME_STATE:
      return {
        ...state,
        isAdmin: payload.isAdmin,
        isNewDay: payload.isNewDay,
        brownBag: payload.brownBag,
        idealMeal: payload.idealMeal,
        completedToday: payload.completedToday,
        nutritionScore: payload.nutritionScore,
        superCombosFound: payload.superCombosFound,
        xp: payload.xp,
        level: payload.level,
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        hasRewardToken: payload.hasRewardToken,
        dailyBuff: payload.dailyBuff,
        hotStreakActive: payload.hotStreakActive,
        idealPickupStreak: payload.idealPickupStreak,
        spawnRadiusMin: payload.spawnRadiusMin,
        spawnRadiusMax: payload.spawnRadiusMax,
        proximityRadius: payload.proximityRadius,
        error: "",
      };
    case SET_BROWN_BAG:
      return {
        ...state,
        brownBag: payload.brownBag,
        ...(payload.xp !== undefined && { xp: payload.xp }),
        ...(payload.level !== undefined && { level: payload.level }),
        hotStreakActive: payload.hotStreakActive,
        idealPickupStreak: payload.idealPickupStreak,
      };
    case SET_IDEAL_MEAL:
      return {
        ...state,
        idealMeal: payload.idealMeal,
      };
    case SET_NEARBY_ITEMS:
      return {
        ...state,
        nearbyItems: payload.nearbyItems,
      };
    case SET_COMPLETED:
      return {
        ...state,
        completedToday: true,
        nutritionScore: payload.nutritionScore,
        superCombosFound: payload.superCombosFound,
        xp: payload.xp,
        level: payload.level,
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
      };
    case SET_DAILY_BUFF:
      return {
        ...state,
        dailyBuff: payload.dailyBuff,
        hasRewardToken: false,
      };
    case SET_ERROR:
      return {
        ...state,
        error: payload.error,
      };
    default: {
      throw new Error(`Unhandled action type: ${type}`);
    }
  }
};

export { globalReducer };
