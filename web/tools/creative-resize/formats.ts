export interface PresetFormat {
	name: string;
	width: number;
	height: number;
	promptHint: string;
	category: string;
}

export const PRESET_FORMATS: PresetFormat[] = [
	{
		name: "Instagram Feed",
		width: 1080,
		height: 1080,
		promptHint: "square 1:1 format, center the main subject, balanced composition",
		category: "Instagram",
	},
	{
		name: "Instagram Story",
		width: 1080,
		height: 1920,
		promptHint:
			"vertical 9:16 story format, keep key elements in the center third, leave safe zones top and bottom",
		category: "Instagram",
	},
	{
		name: "Instagram Landscape",
		width: 1080,
		height: 566,
		promptHint:
			"horizontal 1.91:1 landscape format, spread elements across the width",
		category: "Instagram",
	},
	{
		name: "Facebook Post",
		width: 1200,
		height: 628,
		promptHint: "horizontal 1.91:1 Facebook post, balanced and bold composition",
		category: "Facebook",
	},
	{
		name: "Facebook Story",
		width: 1080,
		height: 1920,
		promptHint:
			"vertical 9:16 Facebook story, full-bleed composition with safe zones",
		category: "Facebook",
	},
	{
		name: "LinkedIn Post",
		width: 1200,
		height: 628,
		promptHint:
			"professional horizontal 1.91:1 format, clean and corporate aesthetic",
		category: "LinkedIn",
	},
	{
		name: "LinkedIn Banner",
		width: 1584,
		height: 396,
		promptHint:
			"ultra-wide 4:1 banner, spread elements horizontally, text on left or center",
		category: "LinkedIn",
	},
	{
		name: "Twitter/X Post",
		width: 1600,
		height: 900,
		promptHint: "widescreen 16:9 format, cinematic horizontal composition",
		category: "Twitter/X",
	},
	{
		name: "Pinterest",
		width: 1000,
		height: 1500,
		promptHint:
			"tall 2:3 vertical format, strong visual hierarchy from top to bottom",
		category: "Pinterest",
	},
	{
		name: "Display 300×250",
		width: 300,
		height: 250,
		promptHint: "compact 6:5 display ad, clear focal point, minimal text",
		category: "Display",
	},
	{
		name: "Leaderboard 728×90",
		width: 728,
		height: 90,
		promptHint:
			"ultra-wide horizontal banner, logo left, key message center, CTA right",
		category: "Display",
	},
];
