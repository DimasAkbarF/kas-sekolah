import { formatCurrency } from "./formatters";

// Chart palette — consumed from theme tokens (--chart-*) so mock data and
// dashboards stay consistent, with semantic overrides for paid/unpaid.
export const CHART_PRIMARY = "var(--chart-1)"; // Primary Teal #2BA8A2
export const CHART_SUCCESS = "var(--chart-2)"; // Success Green #1B7F4B
export const CHART_WARNING = "var(--chart-3)"; // Coral Warning #EF6C4A
export const CHART_DANGER = "var(--destructive)"; // Coral Destructive
export const CHART_GOLD = "var(--chart-5)"; // Accent Gold #FFD23F
export const CHART_SKY = "var(--chart-4)"; // Sky Blue #5DADE2

// Aksen/grid chart ikut tema: token ini sudah berubah antara light dan dark.
export const CHART_GRID = "var(--border)";
export const CHART_AXIS = "var(--muted-foreground)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any, ...rest: any[]) => [string, string];

export const tooltipCurrencyFormatter: TooltipFormatter = (value, name) => {
 return [formatCurrency(Number(value)), String(name)];
};
