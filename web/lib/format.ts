/**
 * The app's one date formatter: screens never call toLocaleString by hand,
 * so every date on every screen reads the same.
 */
const dateTime = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

/** "Nov 23, 2026, 5:22 PM" in the viewer's locale; "—" when there's no date. */
export function formatDateTime(
	value: string | number | Date | null | undefined,
) {
	if (value == null || value === "") return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "—" : dateTime.format(date);
}
