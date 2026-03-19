export function getCurrentDateMT(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

export function isNewDay(lastPlayedDate: string, currentDate?: string): boolean {
  const today = currentDate ?? getCurrentDateMT();
  return lastPlayedDate !== today;
}

/**
 * Returns the ISO week string for the current Mountain Time date.
 * Format: "YYYY-WNN" (e.g. "2026-W12").
 */
export function getCurrentWeekMT(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - jan1.getTime()) / 86400000) + 1;
  const jan1Day = jan1.getDay() || 7; // Monday = 1
  const weekNumber = Math.ceil((dayOfYear + jan1Day - 1) / 7);
  return `${now.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Returns the previous ISO week string relative to the current Mountain Time week.
 */
export function getPreviousWeekMT(): string {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Denver" }));
  const lastWeek = new Date(now.getTime() - 7 * 86400000);
  const jan1 = new Date(lastWeek.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((lastWeek.getTime() - jan1.getTime()) / 86400000) + 1;
  const jan1Day = jan1.getDay() || 7;
  const weekNumber = Math.ceil((dayOfYear + jan1Day - 1) / 7);
  return `${lastWeek.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}
