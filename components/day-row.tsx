"use client"; // Dialog needs client-side state

import { format, isWeekend, isToday } from "date-fns";
import { Text, Badge } from "@radix-ui/themes";
import React, { useRef, useEffect } from "react";

// Import the ActiveEventInfo structure with showTitle
import { ActiveEventInfo } from "./verti-cal"; // Adjust path if needed

// CalendarEvent interface might still be needed if not part of ActiveEventInfo implicitly
// or can be removed if ActiveEventInfo includes the full event structure.
// interface CalendarEvent { ... }

interface DayRowProps {
	date: Date;
	activeEvents: ActiveEventInfo[]; // Expects ActiveEventInfo with showTitle
	onDayClick: (date: Date) => void;
}

export function DayRow({ date, activeEvents = [], onDayClick }: DayRowProps) {
	const isWeekendDay = isWeekend(date);
	const isTodayDate = isToday(date);
	const dayOfMonth = format(date, "d");
	const fullDateStr = format(date, "MMMM d, yyyy");
	const dateStr = format(date, "yyyy-MM-dd"); // Get current date string

	return (
		// Apply rangeClass to this div based on activeEvents[0]?.rangeStatus if needed for row-level styling
		<div
			role="button"
			tabIndex={0}
			className={`
                py-2 px-2 flex items-start gap-4 cursor-pointer
                hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
                ${isWeekendDay ? "ml-8" : "ml-2"}
                ${isTodayDate ? "bg-blue-50 hover:bg-blue-100" : ""}
                relative group
            `}
			aria-label={`Add or view event for ${fullDateStr}`}
			style={{ minHeight: "40px" }} // Ensure minimum row height
			onClick={() => onDayClick(date)}
			onKeyDown={e => {
				if (e.key === "Enter" || e.key === " ") onDayClick(date);
			}}
		>
			{/* Date Number Column */}
			<div className="w-8 pt-0.5 text-right text-sm text-gray-700 relative flex-shrink-0">
				<Text size="2" weight={isTodayDate ? "bold" : "regular"}>
					{dayOfMonth}
				</Text>
				{isTodayDate && (
					<div
						className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
						aria-hidden="true"
					/>
				)}
			</div>

			{/* Events Column */}
			<div className="flex-grow text-sm space-y-1 pt-0.5">
				{activeEvents.length === 0 && <div className="italic text-gray-400 h-5">&nbsp;</div>}{" "}
				{/* Placeholder */}
				{activeEvents.map((activeEventInfo, index) => {
					const { event, showTitle } = activeEventInfo;
					const isRangeEvent = !!event.event_end_date;

					return (
						<div
							key={index}
							className={`relative truncate`}
							style={{ lineHeight: "1.25rem", minHeight: "1.25rem" }}
						>
							{showTitle ? (
								<>
									<Text size="2" className="text-gray-800">
										{event.title}
									</Text>
									{/* Display recurrence badge ONLY if not a range event (and title is shown) */}
									{!isRangeEvent &&
										event.recurring_type &&
										event.recurring_type !== "none" && (
											<Badge
												color="gray"
												variant="soft"
												radius="full"
												size="1"
												ml="2"
												style={{ verticalAlign: "middle" }}
											>
												{event.recurring_type}
											</Badge>
										)}
								</>
							) : (
								<>&nbsp;</>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
