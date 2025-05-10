import type { SupabaseClient } from '@supabase/supabase-js';

// Prevent event propagation when calling a function
interface EventWithPreventDefault extends Event {
	preventDefault: () => void;
}

interface FunctionWithEvent {
	(event: EventWithPreventDefault): void;
}

export function preventDefault(fn: FunctionWithEvent): (event: EventWithPreventDefault) => void {
	return (event: EventWithPreventDefault) => {
		event.preventDefault();
		fn(event);
	};
}

// Logout
export async function logoutUser(supabase: SupabaseClient) {
	await supabase.auth.signOut();
	return;
}
/**
 * Parse a date string into a Date object
 * Handles various formats and natural language expressions
 */
const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const parseDate = async (dateStr: string): Promise<Date | null> => {
	// Normalize the date string
	const normalizedDateStr = dateStr.toLowerCase().trim();
	console.log('Parsing date string:', normalizedDateStr);

	// Extract time component if present in the string
	let timeComponent: { hours: number; minutes: number } | null = null;
	const timeMatch = normalizedDateStr.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

	if (timeMatch) {
		let hours = parseInt(timeMatch[1], 10);
		const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
		const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

		// Adjust hours for PM
		if (ampm === 'pm' && hours < 12) {
			hours += 12;
		}
		// Adjust for 12 AM
		if (ampm === 'am' && hours === 12) {
			hours = 0;
		}

		timeComponent = { hours, minutes };
		console.log('Extracted time component:', timeComponent);
	}

	// Try to parse exact date formats

	// ISO format: YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateStr)) {
		const date = new Date(normalizedDateStr);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// US format: MM/DD/YYYY
	if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(normalizedDateStr)) {
		const datePart = normalizedDateStr.split(/\s+at\s+/)[0];
		const [month, day, year] = datePart.split('/').map(Number);
		const date = new Date(year, month - 1, day);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Short US format: MM/DD
	if (/^\d{1,2}\/\d{1,2}(?:\s|$)/.test(normalizedDateStr)) {
		const datePart = normalizedDateStr.split(/\s+at\s+/)[0];
		const [month, day] = datePart.split('/').map(Number);
		const date = new Date();
		date.setMonth(month - 1);
		date.setDate(day);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// European format: DD.MM.YYYY
	if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(normalizedDateStr)) {
		const datePart = normalizedDateStr.split(/\s+at\s+/)[0];
		const [day, month, year] = datePart.split('.').map(Number);
		const date = new Date(year, month - 1, day);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Handle natural language expressions

	// Today
	if (normalizedDateStr.startsWith('today')) {
		const date = new Date();
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Tomorrow
	if (normalizedDateStr.startsWith('tomorrow')) {
		const date = new Date();
		date.setDate(date.getDate() + 1);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Day after tomorrow
	if (
		normalizedDateStr.startsWith('day after tomorrow') ||
		normalizedDateStr.startsWith('overmorrow')
	) {
		const date = new Date();
		date.setDate(date.getDate() + 2);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Next week
	if (normalizedDateStr.includes('next week')) {
		const date = new Date();
		date.setDate(date.getDate() + 7);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Next month
	if (normalizedDateStr.includes('next month')) {
		const date = new Date();
		date.setMonth(date.getMonth() + 1);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// This weekend
	if (normalizedDateStr.includes('this weekend')) {
		const date = new Date();
		const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
		const daysUntilSaturday = dayOfWeek === 6 ? 0 : 6 - dayOfWeek;
		date.setDate(date.getDate() + daysUntilSaturday);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Next weekend
	if (normalizedDateStr.includes('next weekend')) {
		const date = new Date();
		const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
		const daysUntilNextSaturday = dayOfWeek === 6 ? 7 : 13 - dayOfWeek;
		date.setDate(date.getDate() + daysUntilNextSaturday);
		if (timeComponent) {
			date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return date;
	}

	// Days of the week (e.g., "monday", "next monday")
	for (let i = 0; i < daysOfWeek.length; i++) {
		const day = daysOfWeek[i];

		// Check for "next [day]"
		if (normalizedDateStr.includes(`next ${day}`)) {
			const date = new Date();
			const currentDay = date.getDay(); // 0 = Sunday, 6 = Saturday
			const targetDay = i;
			let daysToAdd = targetDay - currentDay;
			if (daysToAdd <= 0) daysToAdd += 7;
			daysToAdd += 7; // Add another week since it's "next"
			date.setDate(date.getDate() + daysToAdd);
			if (timeComponent) {
				date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
			}
			return date;
		}

		// Check for just the day name (e.g., "monday")
		if (normalizedDateStr.startsWith(day)) {
			const date = new Date();
			const currentDay = date.getDay(); // 0 = Sunday, 6 = Saturday
			const targetDay = i;
			let daysToAdd = targetDay - currentDay;
			if (daysToAdd <= 0) daysToAdd += 7; // If today or already passed this week, go to next week
			date.setDate(date.getDate() + daysToAdd);
			if (timeComponent) {
				date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
			}
			return date;
		}
	}

	// Handle specific time expressions (e.g., "at 3pm")
	if (normalizedDateStr.startsWith('at ') && timeComponent) {
		const date = new Date();
		date.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);

		// If the time has already passed today, set it for tomorrow
		if (date < new Date()) {
			date.setDate(date.getDate() + 1);
		}

		return date;
	}

	// Try to parse with built-in Date parser as a last resort
	const parsedDate = new Date(normalizedDateStr);
	if (!isNaN(parsedDate.getTime())) {
		if (timeComponent) {
			parsedDate.setHours(timeComponent.hours, timeComponent.minutes, 0, 0);
		}
		return parsedDate;
	}

	// Could not parse the date
	return null;
};
