export const AGENT_TOOLS = [
  {
    type: "function" as const,
    name: "jump_to_day",
    description: "Scroll Vertical to a specific calendar day so the user can see it.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Target day as YYYY-MM-DD." },
      },
      required: ["date"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "create_event",
    description: "Create a calendar event. Use this when the user wants to add or schedule something.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Event start date as YYYY-MM-DD." },
        title: { type: "string", description: "Event title, 1 to 160 characters." },
        time: { type: "string", description: "Optional 24-hour time as HH:MM." },
        color: { type: "string", description: "Optional hex color." },
        end_date: { type: "string", description: "Optional last day of a multi-day event as YYYY-MM-DD." },
        repeat_rule: { type: "string", enum: ["none", "daily", "weekly", "monthly", "yearly"] },
        repeat_interval: { type: "integer", minimum: 1, maximum: 99 },
        repeat_until: { type: "string", description: "Optional repeat end date as YYYY-MM-DD." },
        repeat_weekdays: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 6 },
          description: "Sunday=0 through Saturday=6. Use for weekly repeats.",
        },
      },
      required: ["date", "title"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "update_event",
    description: "Change an existing event. Identify it with id, or with title_query and optional date.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Exact event id when known." },
        title_query: { type: "string", description: "Title text to match when id is unknown." },
        date: { type: "string", description: "Current event date as YYYY-MM-DD to disambiguate." },
        new_date: { type: "string", description: "New start date as YYYY-MM-DD." },
        end_date: { type: "string", description: "New last day as YYYY-MM-DD. Pass empty string to clear the range." },
        new_title: { type: "string" },
        time: { type: "string", description: "New time as HH:MM. Pass empty string to clear time." },
        color: { type: "string" },
        repeat_rule: { type: "string", enum: ["none", "daily", "weekly", "monthly", "yearly"] },
        repeat_interval: { type: "integer", minimum: 1, maximum: 99 },
        repeat_until: { type: "string" },
        repeat_weekdays: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 } },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "remove_event",
    description: "Delete an event. Identify it with id, or with title_query and optional date.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string" },
        title_query: { type: "string" },
        date: { type: "string", description: "Event date as YYYY-MM-DD to disambiguate." },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "list_events",
    description: "List known events so you can match the right one before update or remove.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional title filter." },
        date: { type: "string", description: "Optional date filter as YYYY-MM-DD." },
      },
      additionalProperties: false,
    },
  },
]

export type AgentToolName = (typeof AGENT_TOOLS)[number]["name"]
