import {
  ActionType,
  InitialState,
  SET_ERROR,
  SET_GAME_STATE,
  SET_HAS_INTERACTIVE_PARAMS,
  SET_BROWN_BAG,
  SET_TARGET_MEAL,
  SET_COMPLETED,
  SET_DAILY_BUFF,
  SET_FOOD_ITEMS_IN_WORLD,
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
        isFirstPlay: payload.isFirstPlay,
        brownBag: payload.brownBag,
        targetMeal: payload.targetMeal,
        completedToday: payload.completedToday,
        nutritionScore: payload.nutritionScore,
        superCombosFound: payload.superCombosFound,
        xp: payload.xp,
        level: payload.level,
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        dailyBuff: payload.dailyBuff,
        hotStreakActive: payload.hotStreakActive,
        pickupStreak: payload.pickupStreak,
        badges: payload.badges ?? state.badges,
        visitorInventory: payload.visitorInventory ?? state.visitorInventory,
        leaderboard: payload.leaderboard ?? state.leaderboard,
        dropRadiusMin: payload.dropRadiusMin,
        dropRadiusMax: payload.dropRadiusMax,
        proximityRadius: payload.proximityRadius,
        foodItemsInWorld: payload.foodItemsInWorld ?? state.foodItemsInWorld,
        error: "",
      };
    case SET_BROWN_BAG:
      return {
        ...state,
        brownBag: payload.brownBag,
        ...(payload.xp !== undefined && { xp: payload.xp }),
        ...(payload.level !== undefined && { level: payload.level }),
        hotStreakActive: payload.hotStreakActive,
        pickupStreak: payload.pickupStreak,
        ...(payload.visitorInventory && { visitorInventory: payload.visitorInventory }),
        error: "",
      };
    case SET_TARGET_MEAL:
      return {
        ...state,
        targetMeal: payload.targetMeal,
        error: "",
      };
    case SET_COMPLETED:
      return {
        ...state,
        completedToday: true,
        nutritionScore: payload.nutritionScore,
        nutritionBreakdown: payload.nutritionBreakdown,
        superCombosFound: payload.superCombosFound,
        xp: payload.xp,
        level: payload.level,
        currentStreak: payload.currentStreak,
        longestStreak: payload.longestStreak,
        ...(payload.visitorInventory && { visitorInventory: payload.visitorInventory }),
        ...(payload.leaderboard && { leaderboard: payload.leaderboard }),
        isNewStreakRecord: payload.isNewStreakRecord,
        error: "",
      };
    case SET_DAILY_BUFF:
      return {
        ...state,
        dailyBuff: payload.dailyBuff,
        error: "",
      };
    case SET_FOOD_ITEMS_IN_WORLD:
      return {
        ...state,
        foodItemsInWorld: payload.foodItemsInWorld,
        error: "",
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
