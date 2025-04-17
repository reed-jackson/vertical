import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai"; // Or your preferred provider
// import { groq } from '@ai-sdk/groq'; // Keep only one provider import
import { z } from "zod";
import { format } from "date-fns";
import { performance } from "perf_hooks";

// Define the Zod schema based on the NEW CalendarEvent interface
const EventSchema = z.object({
	title: z.string().describe("The concise title of the event."),
	description: z.string().optional().nullable().describe("A brief description of the event, if provided."),
	event_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in yyyy-MM-dd format")
		.describe("The primary date of the event in yyyy-MM-dd format."),
	event_end_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in yyyy-MM-dd format")
		.optional()
		.nullable()
		.describe(
			"The end date FOR MULTI-DAY events in yyyy-MM-dd format. Omit or null for single-day events. Do NOT use this for recurrence."
		),
	event_type: z
		.string()
		.default("personal") // Default type if not specified
		.describe(
			"Categorize the event (e.g., 'appointment', 'holiday', 'task', 'personal', 'meeting', 'reminder')."
		),
	recurring_type: z
		.enum(["none", "daily", "weekly", "monthly", "yearly"])
		.optional()
		.nullable()
		.default("none")
		.describe(
			"The type of recurrence. Use 'none' if the event does not repeat or if event_end_date is set for a multi-day span."
		),
	recurring_interval: z
		.number()
		.int()
		.positive()
		.optional()
		.nullable()
		.describe(
			"The interval for recurrence (e.g., 1 for weekly, 2 for bi-weekly). Only applies if recurring_type is not 'none'."
		),
	recurring_end_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in yyyy-MM-dd format")
		.optional()
		.nullable()
		.describe(
			"The date when the recurrence stops, in yyyy-MM-dd format. Only applies if recurring_type is not 'none'."
		),
});

// Define the structure of the expected request body
const RequestBodySchema = z.object({
	text: z.string().min(1, "Input text cannot be empty."),
});

export async function POST(request: Request) {
	try {
		const requestBody = await request.json();

		// Validate request body
		const validationResult = RequestBodySchema.safeParse(requestBody);
		if (!validationResult.success) {
			return NextResponse.json(
				{ error: "Invalid request body", details: validationResult.error.errors },
				{ status: 400 }
			);
		}

		const { text } = validationResult.data;
		const currentDate = format(new Date(), "yyyy-MM-dd"); // Provide context for relative dates

		console.log(`API received text: "${text}", Current date: ${currentDate}`);

		// --- Model Selection ---
		const model = openai("gpt-4o-mini"); // Or use groq('gemma2-9b-it'); etc.
		// const model = groq('gemma2-9b-it');
		console.log("Using model:", model.modelId);

		// Start timer before AI call
		const startTime = performance.now();

		// --- Use generateObject with updated prompt ---
		const { object: parsedEventData, usage } = await generateObject({
			model,
			schema: EventSchema,
			prompt: `Parse the following user input into a calendar event object. Assume the current date is ${currentDate}. 
			- Extract the title, description (if any), event_date (yyyy-MM-dd), and an optional event_end_date (yyyy-MM-dd) for events spanning multiple days.
			- Determine the event_type (e.g., 'appointment', 'holiday', 'task', 'personal', 'meeting', 'reminder'). Default to 'personal' if unsure.
			- Determine recurrence: 
			  - If the event spans multiple days (event_end_date is set), recurring_type MUST be 'none'.
			  - If the event repeats (e.g., 'every week', 'monthly', 'daily'), set recurring_type ('daily', 'weekly', 'monthly', 'yearly') and recurring_interval (e.g., 1 for 'every week', 2 for 'every other week'). 
			  - If recurrence is specified, extract recurring_end_date (yyyy-MM-dd) if mentioned (e.g., 'until Dec 31st').
			  - If no recurrence is mentioned, default recurring_type to 'none'.
			- ALL dates must be in yyyy-MM-dd format.
			User input: "${text}"`,
		});

		// End timer after AI call
		const endTime = performance.now();
		const duration = endTime - startTime;

		console.log(`Inference time: ${duration.toFixed(2)} ms`);
		console.log("AI SDK Usage:", usage);
		console.log("Parsed Event Data (before final processing):", parsedEventData);

		// --- Post-processing and Validation ---
		// Generate a unique ID (replace with actual DB ID later)
		const eventId = crypto.randomUUID();

		// Ensure recurrence type is 'none' if event_end_date is present
		const recurringType = parsedEventData.event_end_date ? "none" : parsedEventData.recurring_type || "none";

		// Ensure interval and recurring end date are null if recurrence type is 'none'
		const recurringInterval = recurringType === "none" ? null : parsedEventData.recurring_interval || 1; // Default interval to 1 if recurring but not specified
		const recurringEndDate = recurringType === "none" ? null : parsedEventData.recurring_end_date;

		// Construct the final event object matching the CalendarEvent interface
		const finalEvent = {
			id: eventId,
			title: parsedEventData.title,
			description: parsedEventData.description || null,
			event_date: parsedEventData.event_date,
			event_end_date: parsedEventData.event_end_date || null,
			event_type: parsedEventData.event_type || "personal", // Ensure default
			recurring_type: recurringType,
			recurring_interval: recurringInterval,
			recurring_end_date: recurringEndDate,
			// user_id, created_at, updated_at would be set server-side or by DB
		};

		console.log("Final event object (mock saved):", finalEvent);

		// Simulate saving to DB (log for now)
		// await saveEventToDatabase(finalEvent); // Replace with actual DB logic

		return NextResponse.json(finalEvent, { status: 200 });
	} catch (error: any) {
		console.error("Error in /api/events/parse:", error);

		// Provide more specific error messages if possible
		let errorMessage = "Failed to parse event.";
		let statusCode = 500;

		if (error.message?.includes("rate limit")) {
			errorMessage = "Rate limit exceeded. Please try again later.";
			statusCode = 429;
		} else if (error.message?.includes("authentication") || error.message?.includes("API key")) {
			errorMessage = "Authentication failed. Check AI provider API key.";
			statusCode = 401;
		} else if (error.name === "ZodError" || error.message?.includes("schema validation failed")) {
			errorMessage = "Invalid data format received from AI.";
			statusCode = 500; // Internal error, AI didn't follow schema
		} else if (error instanceof SyntaxError) {
			errorMessage = "Invalid JSON received in request.";
			statusCode = 400;
		}

		return NextResponse.json({ error: errorMessage, details: error.message }, { status: statusCode });
	}
}

// Add runtime and preferredRegion configuration if deploying to Vercel Edge
// export const runtime = 'edge';
// export const preferredRegion = 'iad1'; // Example: US East
