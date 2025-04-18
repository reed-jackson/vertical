import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // Use the server client
import { CalendarEvent } from "@/types/calendarEvent"; // Import the event type

// GET handler to fetch all events
export async function GET() {
	const supabase = await createClient(); // Create server client instance

	try {
		// Assuming your table is named 'events'
		const { data: events, error } = await supabase.from("events").select("*");

		if (error) {
			console.error("Supabase GET Error:", error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(events);
	} catch (err: any) {
		console.error("API GET Error:", err);
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// POST handler to create a new event
export async function POST(request: Request) {
	const supabase = await createClient(); // Create server client instance

	try {
		const eventData: Partial<CalendarEvent> = await request.json();

		// Basic validation (more robust validation might be needed)
		if (!eventData.title || !eventData.event_date) {
			return NextResponse.json({ error: "Missing required fields: title, event_date" }, { status: 400 });
		}

		// Remove id if present, Supabase generates it
		delete eventData.id;

		// Insert the new event into the 'events' table
		// Ensure the object keys match your Supabase column names
		const { data: newEvent, error } = await supabase
			.from("events")
			.insert([eventData]) // Pass data as an array
			.select() // Select the newly created record
			.single(); // Expect a single record back

		if (error) {
			console.error("Supabase POST Error:", error);
			// Provide more specific error if possible (e.g., duplicate key)
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json(newEvent, { status: 201 });
	} catch (err: any) {
		console.error("API POST Error:", err);
		// Handle JSON parsing errors separately if needed
		if (err instanceof SyntaxError) {
			return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
		}
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// DELETE handler to delete an event
export async function DELETE(request: Request) {
	const supabase = await createClient(); // Create server client instance
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");
	if (!id) {
		return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
	}

	try {
		const { error } = await supabase.from("events").delete().eq("id", id);

		if (error) {
			console.error("Supabase DELETE Error:", error);
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });
	} catch (err: any) {
		console.error("API DELETE Error:", err);
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}

// PUT handler to update an existing event
export async function PUT(request: Request) {
	const supabase = await createClient(); // Create server client instance
	const { searchParams } = new URL(request.url);
	const id = searchParams.get("id");

	if (!id) {
		return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
	}

	try {
		const eventData: Partial<CalendarEvent> = await request.json();

		// Basic validation (you might want more robust validation)
		if (Object.keys(eventData).length === 0) {
			return NextResponse.json({ error: "Missing update data" }, { status: 400 });
		}

		// Ensure id from the body doesn't overwrite the id from the URL
		delete eventData.id;

		// Update the event in the 'events' table
		const { data: updatedEvent, error } = await supabase
			.from("events")
			.update(eventData) // Pass the fields to update
			.eq("id", id) // Specify which event to update
			.select() // Select the updated record
			.single(); // Expect a single record back

		if (error) {
			console.error("Supabase PUT Error:", error);
			// Handle potential errors like row not found (though update might not error)
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		if (!updatedEvent) {
			// Handle case where the update didn't find a matching row
			return NextResponse.json({ error: `Event with ID ${id} not found` }, { status: 404 });
		}

		return NextResponse.json(updatedEvent, { status: 200 });
	} catch (err: any) {
		console.error("API PUT Error:", err);
		if (err instanceof SyntaxError) {
			return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
		}
		return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
	}
}
