export interface CalendarEvent {
	id: string; // UUID
	user_id?: string; // UUID, optional on client
	title: string;
	description?: string | null;
	event_date: string; // Format: 'yyyy-MM-dd'
	event_end_date?: string | null; // Format: 'yyyy-MM-dd' or null
	event_type: string; // e.g., 'appointment', 'holiday', 'task', 'personal'
	recurring_type?: "none" | "daily" | "weekly" | "monthly" | "yearly" | null;
	recurring_interval?: number | null; // e.g., 1 for daily, 2 for bi-weekly
	recurring_end_date?: string | null; // Format: 'yyyy-MM-dd' or null
	created_at?: string; // ISO string
	updated_at?: string; // ISO string
}
