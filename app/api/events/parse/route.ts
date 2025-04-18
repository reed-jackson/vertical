import { NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai"; // Or your preferred provider
import { groq } from "@ai-sdk/groq"; // Keep only one provider import
import { z } from "zod";
import { format } from "date-fns";
import { performance } from "perf_hooks";
import { createClient } from "@/lib/supabase/server"; // Import Supabase server client
import { CalendarEvent } from "@/types/calendarEvent"; // Import type if needed for casting

// Define the Zod schema based on the NEW CalendarEvent interface
const EventSchema = z.object({
	title: z.string().describe("The concise title of the event."),
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

		const { text: userInput } = validationResult.data;
		const currentDate = format(new Date(), "yyyy-MM-dd"); // Provide context for relative dates

		console.log(`API received text: "${userInput}", Current date: ${currentDate}`);

		// --- Model Selection ---
		const model = groq("llama-3.1-8b-instant");
		console.log("Using model:", model.modelId);

		// Start timer before AI call
		const startTime = performance.now();

		// --- Use generateText with updated prompt ---
		const { text, usage } = await generateText({
			model,
			prompt: `You are an advanced calendar assistant tasked with parsing natural language inputs into structured calendar event objects. Your goal is to accurately interpret user inputs and create well-formatted event data.

First, here's the current date for reference:
<current_date>
${currentDate}
</current_date>

Now, here's the user's input describing an event:
<user_input>
${userInput}
</user_input>

Please analyze this input and create a calendar event object based on the following instructions:

1. Wrap your analysis in <event_analysis> tags to plan your approach and reason through any ambiguities or complex aspects of the input. In your analysis:
   - List all the information explicitly provided in the user input.
   - Identify any ambiguities or missing information.
   - Consider the current date when determining event dates.
   - Reason through any complex aspects of the input.

2. Extract and generate the following components for the calendar event object:
   a. title: Generate a concise and appropriate title (do not simply copy the user input).
   b. description: Extract any additional details provided (if any).
   c. event_date: The start date of the event in yyyy-MM-dd format.
   d. event_end_date: The end date for multi-day events in yyyy-MM-dd format (if applicable).
   e. event_type: Categorize the event (e.g., 'appointment', 'holiday', 'task', 'personal', 'meeting', 'reminder'). Default to 'personal' if uncertain.
   f. recurring_type: Determine if the event repeats ('daily', 'weekly', 'monthly', 'yearly', or 'none').
   g. recurring_interval: For recurring events, specify the interval (e.g., 1 for 'every week', 2 for 'every other week').
   h. recurring_end_date: For recurring events, the end date of the recurrence in yyyy-MM-dd format (if specified).

3. Follow these specific rules:
   - ALL dates must be in yyyy-MM-dd format.
   - If the event spans multiple days (event_end_date is set), recurring_type MUST be 'none'.
   - For recurring events, be precise with date ranges. If a user specifies "until" a certain date, do not include that date in the range.
   - If no recurrence is mentioned, default recurring_type to 'none'.

4. After your analysis, present the calendar event object in the following JSON format, wrapped in <event_object> tags:

<event_object>
{
  "title": "string",
  "event_date": "yyyy-MM-dd",
  "event_end_date": "yyyy-MM-dd",
  "event_type": "string",
  "recurring_type": "string",
  "recurring_interval": number,
  "recurring_end_date": "yyyy-MM-dd"
}
</event_object>

Please proceed with your analysis and creation of the calendar event object.`,
		});

		// End timer after AI call
		const endTime = performance.now();
		const duration = endTime - startTime;

		console.log(`Inference time: ${duration.toFixed(2)} ms`);
		console.log("AI SDK Usage:", usage);
		console.log("Parsed Event Data (before final processing):", text);

		// Extract event object from XML tags
		const eventObjectMatch = text.match(/<event_object>\s*({[\s\S]*?})\s*<\/event_object>/);
		if (!eventObjectMatch) {
			throw new Error("Could not find event object in AI response");
		}

		// Parse the JSON string into an object
		const parsedEventData = JSON.parse(eventObjectMatch[1]);

		// --- Post-processing and Validation ---
		// REMOVED: const eventId = crypto.randomUUID(); // DB will generate ID

		// Ensure recurrence type is 'none' if event_end_date is present
		const recurringType = parsedEventData.event_end_date ? "none" : parsedEventData.recurring_type || "none";

		// Ensure interval and recurring end date are null if recurrence type is 'none'
		const recurringInterval = recurringType === "none" ? null : parsedEventData.recurring_interval || 1; // Default interval to 1 if recurring but not specified
		const recurringEndDate = recurringType === "none" ? null : parsedEventData.recurring_end_date;

		// Construct the object to insert into Supabase (matching table columns)
		const eventToInsert = {
			title: parsedEventData.title,
			event_date: parsedEventData.event_date,
			event_end_date: parsedEventData.event_end_date || null,
			event_type: parsedEventData.event_type || "personal", // Ensure default
			recurring_type: recurringType,
			recurring_interval: recurringInterval,
			recurring_end_date: recurringEndDate,
			// REMOVE id - it will be generated by the database
			// created_at will be set by the database default
		};

		// Input validation for the data to be inserted
		if (!eventToInsert.title || !eventToInsert.event_date) {
			throw new Error("Parsed event data is missing required fields (title or event_date).");
		}

		// --- Save to Database ---
		const supabase = await createClient();
		const { data: savedEvent, error: insertError } = await supabase
			.from("events")
			.insert([eventToInsert]) // Insert the prepared data
			.select() // Select the newly inserted row
			.single(); // Expect only one row back

		if (insertError) {
			console.error("Supabase Insert Error:", insertError);
			throw new Error(`Database error: ${insertError.message}`); // Throw specific DB error
		}

		if (!savedEvent) {
			throw new Error("Database insertion did not return the saved event.");
		}

		console.log("Successfully saved event to DB:", savedEvent);

		// Return the actual saved event data from Supabase
		return NextResponse.json(savedEvent as CalendarEvent, { status: 200 }); // Cast to ensure type safety
	} catch (error: unknown) {
		console.error("Error in /api/events/parse:", error);

		// Provide more specific error messages if possible
		let errorMessage = "Failed to parse and save event."; // Updated default message
		let statusCode = 500;

		// Type guard for objects with message property
		const isErrorWithMessage = (error: unknown): error is { message: string } => {
			return (
				typeof error === "object" &&
				error !== null &&
				"message" in error &&
				typeof (error as { message: unknown }).message === "string"
			);
		};

		const errorWithMessage = isErrorWithMessage(error) ? error.message : "Unknown error occurred";

		if (errorWithMessage.includes("rate limit")) {
			errorMessage = "Rate limit exceeded. Please try again later.";
			statusCode = 429;
		} else if (errorWithMessage.includes("authentication") || errorWithMessage.includes("API key")) {
			errorMessage = "Authentication failed. Check AI provider API key.";
			statusCode = 401;
		} else if (errorWithMessage.includes("Database error")) {
			// Catch the specific DB error we threw
			errorMessage = errorWithMessage; // Use the message from the DB error
			statusCode = 500;
		} else if (
			(error instanceof Error && error.name === "ZodError") ||
			errorWithMessage.includes("schema validation failed")
		) {
			errorMessage = "Invalid data format received from AI.";
			statusCode = 500;
		} else if (error instanceof SyntaxError) {
			errorMessage = "Invalid JSON received in request.";
			statusCode = 400;
		}

		return NextResponse.json({ error: errorMessage, details: errorWithMessage }, { status: statusCode });
	}
}

// Add runtime and preferredRegion configuration if deploying to Vercel Edge
// export const runtime = 'edge';
// export const preferredRegion = 'iad1'; // Example: US East
