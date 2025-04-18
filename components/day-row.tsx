"use client"; // Dialog needs client-side state

import { format, isWeekend, isToday } from "date-fns";
import { Text, Badge, Box, Flex, IconButton } from "@radix-ui/themes";
import React, { useRef, useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";

// Import the ActiveEventInfo structure with showTitle
import { ActiveEventInfo } from "./verti-cal"; // Adjust path if needed

// Import the CalendarEvent type explicitly for the new prop
import { CalendarEvent } from "../types/calendarEvent";

// CalendarEvent interface might still be needed if not part of ActiveEventInfo implicitly
// or can be removed if ActiveEventInfo includes the full event structure.
// interface CalendarEvent { ... }

interface DayRowProps {
	date: Date;
	activeEvents: ActiveEventInfo[]; // Expects ActiveEventInfo with showTitle
	onDayClick: (date: Date) => void;
	onEventDelete: (eventId: string) => void; // Add delete handler prop
	onEventClick: (event: CalendarEvent) => void; // Add event click handler prop
}

export function DayRow({ date, activeEvents = [], onDayClick, onEventDelete, onEventClick }: DayRowProps) {
	const isWeekendDay = isWeekend(date);
	const isTodayDate = isToday(date);
	const dayOfMonth = format(date, "d");
	const fullDateStr = format(date, "MMMM d, yyyy");
	const dateStr = format(date, "yyyy-MM-dd"); // Get current date string

	return (
		// Apply rangeClass to this div based on activeEvents[0]?.rangeStatus if needed for row-level styling
		<Flex
			role="button"
			tabIndex={0}
			align="start"
			pl={isWeekendDay ? "5" : "0"}
			position={"relative"}
			py="2"
			pr="2"
			gap="4"
			className={`
              cursor-pointer
                hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded
        
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
			<Flex
				className="w-8 pt-0.5 text-right text-sm text-gray-700 relative flex-shrink-0"
				align="center"
				gap="1"
			>
				{/** 
				<Text className="text-gray-500" style={{ fontSize: "0.5rem" }}>
					{format(date, "EEEEE")}
				</Text>
				*/}
				<Text size="2" weight={isTodayDate ? "bold" : "regular"}>
					{dayOfMonth}
				</Text>
			</Flex>

			{/* Events Column */}
			<div className="flex-grow text-sm space-y-1 pt-0.5">
				{activeEvents.length === 0 && <div className="italic text-gray-400 h-5">&nbsp;</div>}{" "}
				{/* Placeholder */}
				{activeEvents.map((activeEventInfo, index) => {
					const { event, showTitle } = activeEventInfo;
					const isRangeEvent = !!event.event_end_date;

					const handleDeleteClick = (e: React.MouseEvent) => {
						e.stopPropagation(); // Prevent triggering onDayClick
						onEventDelete(event.id); // Call the delete handler
					};

					return (
						<div
							key={event.id} // Use event.id as key for stability
							className={`relative group truncate`} // Add group for hover effects
							style={{ lineHeight: "1.25rem", minHeight: "1.25rem" }}
						>
							{showTitle ? (
								<Flex gap="2" align="center">
									<Text
										size="2"
										className="text-gray-800 cursor-pointer hover:underline" // Make text clickable
										onClick={e => {
											e.stopPropagation(); // Prevent triggering onDayClick
											onEventClick(event); // Trigger the new handler
										}}
									>
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
									{/* Delete Button - appears on hover */}
									<Flex className="opacity-0 group-hover:opacity-100 duration-250 overflow-visible">
										<IconButton
											size="1"
											variant="ghost"
											color="gray"
											radius="full"
											className={`absolute right-0 top-0 transition-opacity duration-150 opacity-10 hover:opacity-100`}
											style={{ verticalAlign: "middle", marginTop: "-2px" }} // Adjust alignment as needed
											onClick={handleDeleteClick}
											aria-label={`Delete event ${event.title}`}
										>
											<IconX size={14} />
										</IconButton>
									</Flex>
								</Flex>
							) : (
								<>&nbsp;</> // Keep non-title placeholders non-clickable
							)}
						</div>
					);
				})}
			</div>

			{isTodayDate && (
				<Flex position={"absolute"} right={"2"} top={"10px"}>
					<Badge size={"1"} color={"grass"}>
						TODAY
					</Badge>
				</Flex>
			)}
		</Flex>
	);
}
