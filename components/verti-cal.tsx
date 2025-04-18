"use client";

import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { DayRow } from "./day-row";
import {
	startOfDay,
	addDays,
	differenceInDays,
	parseISO,
	format,
	getYear,
	getMonth,
	isAfter,
	isValid,
	// eachDayOfInterval, // Not needed for current recurrence logic
	isSameDay,
	// differenceInCalendarDays, // More robust date-fns functions available
	isBefore,
	addWeeks,
	addMonths,
	addYears,
} from "date-fns";
import { useMemo, useState, useCallback, useRef } from "react";
import {
	Box,
	Heading,
	Text,
	Button,
	Flex,
	TextField,
	Select,
	TextArea,
	IconButton,
	Spinner,
	Container,
} from "@radix-ui/themes";
import { IconArrowUp, IconPlus } from "@tabler/icons-react";
// Remove ReactDatePicker import if no longer used elsewhere
// import ReactDatePicker from "react-datepicker";
// Remove direct import of datepicker CSS if it's in globals.css
// import "react-datepicker/dist/react-datepicker.css";

// Import the new Drawer components
import {
	Drawer,
	BottomDrawerContent, // Use the custom content
	DrawerFooter,
	DrawerTrigger, // Keep trigger for the FAB
} from "./bottom-drawer"; // Adjust path if needed

// Import the formal CalendarEvent type
import { CalendarEvent } from "../types/calendarEvent";

// Define the structure passed to DayRow - Simplified
export interface ActiveEventInfo {
	event: CalendarEvent; // Use the imported type
	showTitle: boolean;
}

// Updated dummy data structure using NEW CalendarEvent type
const initialDummyEvents = new Map<string, CalendarEvent[]>();
initialDummyEvents.set("2025-04-15", [
	{
		id: "1",
		title: "Meeting with Alex",
		event_date: "2025-04-15",
		event_type: "meeting",
		recurring_type: "none",
	},
]);
initialDummyEvents.set("2025-04-17", [
	{
		id: "2",
		title: "Project deadline",
		event_date: "2025-04-17",
		event_type: "task",
		recurring_type: "none",
	},
	{
		id: "3",
		title: "Team lunch",
		event_date: "2025-04-17",
		event_type: "personal",
		recurring_type: "none",
	},
]);
initialDummyEvents.set("2025-05-01", [
	{
		id: "4",
		title: "May Day",
		event_date: "2025-05-01",
		event_type: "holiday",
		recurring_type: "yearly", // Matches SQL schema
		recurring_interval: 1,
	},
]);
// Example of a ranged event
initialDummyEvents.set("2025-06-06", [
	{
		id: "5",
		title: "Trip to Lisbon",
		event_date: "2025-06-06",
		event_end_date: "2025-06-16",
		event_type: "personal",
		recurring_type: "none", // Ranged events don't recur in this model
	},
]);
// Example of a recurring event (every 2 weeks)
initialDummyEvents.set("2025-07-11", [
	{
		id: "8",
		title: "Bi-weekly sync",
		event_date: "2025-07-11",
		event_type: "meeting",
		recurring_type: "weekly",
		recurring_interval: 2,
		recurring_end_date: "2025-12-31", // Example end date
	},
]);

// Define the start and end dates for the calendar range
const START_DATE_STR = "1970-01-01";
const END_DATE_STR = "2100-12-31";
// Define the target date for centering (as per rules)
const TARGET_DATE_STR = "2025-04-15";

// Recurrence options might not be needed in the UI anymore
// const recurrenceOptions = [ ... ];

// Updated helper function to get events for a specific date
function getEventsForDate(targetDate: Date, allEvents: Map<string, CalendarEvent[]>): ActiveEventInfo[] {
	const activeEvents: ActiveEventInfo[] = [];

	allEvents.forEach(eventsOnStartDate => {
		eventsOnStartDate.forEach(event => {
			// Basic validation using new field names
			if (!event || !event.title || !event.event_date) return;
			if (!/\d{4}-\d{2}-\d{2}/.test(event.event_date)) return;

			const eventStartDate = parseISO(event.event_date);
			if (!isValid(eventStartDate)) return;

			let isActive = false;
			let showTitle = true; // Default to true, adjust for ranges

			// --- Check 1: Direct Start Date Match ---
			if (isSameDay(targetDate, eventStartDate)) {
				isActive = true;
			}

			// --- Check 2: Within Date Range (event_end_date) ---
			if (!isActive && event.event_end_date) {
				if (!/\d{4}-\d{2}-\d{2}/.test(event.event_end_date)) return; // Skip invalid format
				const eventEndDate = parseISO(event.event_end_date);
				if (
					isValid(eventEndDate) &&
					!isBefore(eventEndDate, eventStartDate) && // end >= start
					isAfter(targetDate, eventStartDate) && // target > start (start already checked)
					(isSameDay(targetDate, eventEndDate) || isBefore(targetDate, eventEndDate)) // target <= end
				) {
					isActive = true;
					// Only show title on start and end days of the range
					showTitle = isSameDay(targetDate, eventStartDate) || isSameDay(targetDate, eventEndDate);
				}
			}

			// --- Check 3: Recurrence Rules ---
			// Recurrence applies *after* the original start date and only if not already active.
			// Also, recurrence doesn't apply if it's a ranged event (event_end_date is set).
			if (
				!isActive &&
				!event.event_end_date && // Cannot be ranged AND recurring
				event.recurring_type &&
				event.recurring_type !== "none" &&
				isAfter(targetDate, eventStartDate) // Only check dates after the initial start
			) {
				// Check if recurrence has ended
				if (event.recurring_end_date) {
					const recurringEndDate = parseISO(event.recurring_end_date);
					if (isValid(recurringEndDate) && isAfter(targetDate, recurringEndDate)) {
						return; // Stop processing this event for this date if recurrence has ended
					}
				}

				const interval = event.recurring_interval || 1; // Default interval to 1
				let currentDateToCheck = eventStartDate;

				while (isBefore(currentDateToCheck, targetDate) || isSameDay(currentDateToCheck, targetDate)) {
					if (isSameDay(currentDateToCheck, targetDate)) {
						isActive = true;
						showTitle = true; // Recurring instances always show title
						break; // Found a match for the target date
					}

					// Increment date based on recurrence type and interval
					try {
						switch (event.recurring_type) {
							case "daily":
								currentDateToCheck = addDays(currentDateToCheck, interval);
								break;
							case "weekly":
								currentDateToCheck = addWeeks(currentDateToCheck, interval);
								break;
							case "monthly":
								currentDateToCheck = addMonths(currentDateToCheck, interval);
								break;
							case "yearly":
								currentDateToCheck = addYears(currentDateToCheck, interval);
								break;
							default:
								// Should not happen due to initial check, but good for safety
								return; // Exit loop/function for this event
						}
					} catch (e) {
						console.error("Error calculating next recurrence date:", e);
						break; // Exit loop on error
					}

					// Safety break for potential infinite loops (e.g., invalid interval)
					if (!isValid(currentDateToCheck) || isBefore(currentDateToCheck, eventStartDate)) {
						console.warn("Potential recurrence loop detected, breaking.", event);
						break;
					}
				}
			}

			// --- Add to list if active ---
			if (isActive) {
				activeEvents.push({ event, showTitle });
			}
		});
	});

	return activeEvents;
}

export function VertiCal() {
	const startDate = useMemo(() => startOfDay(parseISO(START_DATE_STR)), []);
	const endDate = useMemo(() => startOfDay(parseISO(END_DATE_STR)), []);
	const targetDate = useMemo(() => startOfDay(parseISO(TARGET_DATE_STR)), []);
	const today = useMemo(() => startOfDay(new Date()), []);

	const totalDays = useMemo(() => differenceInDays(endDate, startDate) + 1, [startDate, endDate]);
	const initialIndex = useMemo(() => differenceInDays(targetDate, startDate), [targetDate, startDate]);
	const todayIndex = useMemo(() => differenceInDays(today, startDate), [today, startDate]);

	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const [isScrolling, setIsScrolling] = useState(false);

	// --- State Management for Events ---
	// Use CalendarEvent type for the state
	const [events, setEvents] = useState(new Map<string, CalendarEvent[]>(initialDummyEvents));

	// --- State for Sticky Headers and "Today" Button ---
	const [currentYear, setCurrentYear] = useState<number>(getYear(targetDate));
	const [currentMonth, setCurrentMonth] = useState<string>(format(targetDate, "MMMM"));
	const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
		start: initialIndex,
		end: initialIndex,
	});

	// --- State for Single Bottom Drawer ---
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	// Remove old drawer state: drawerDate, drawerEndDate, drawerTitle, drawerRecurrence
	// Add state for the text area input
	const [eventInputText, setEventInputText] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false); // To disable button during API call
	// --- End Drawer State ---

	// --- Event Handling Logic (Updated for API call) ---
	const handleDrawerSave = useCallback(async () => {
		const textToParse = eventInputText.trim();
		if (!textToParse) return;

		setIsSubmitting(true);
		console.log("Sending to API:", textToParse);

		try {
			const response = await fetch("/api/events/parse", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ text: textToParse }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `API Error: ${response.statusText}`);
			}

			const parsedEvent: CalendarEvent = await response.json();

			// Updated validation logic using new field names
			if (
				!parsedEvent ||
				!parsedEvent.id ||
				!parsedEvent.title ||
				!parsedEvent.event_date ||
				!isValid(parseISO(parsedEvent.event_date)) ||
				(parsedEvent.event_end_date && !isValid(parseISO(parsedEvent.event_end_date)))
				// Add more checks based on new fields if necessary (e.g., recurrence consistency)
			) {
				console.error("Received invalid event data from API:", parsedEvent);
				throw new Error("Received invalid event data from API.");
			}

			console.log("Received parsed event:", parsedEvent);

			// Add the parsed event to the state using event_date as the key
			setEvents(prevEvents => {
				const newEventsMap = new Map(prevEvents);
				const dateKey = parsedEvent.event_date; // Use event_date
				const existingEvents = newEventsMap.get(dateKey) || [];
				// IMPORTANT: Ensure we don't add duplicates if the API is called multiple times
				if (!existingEvents.some(ev => ev.id === parsedEvent.id)) {
					newEventsMap.set(dateKey, [...existingEvents, parsedEvent]);
				}
				return newEventsMap;
			});

			setIsDrawerOpen(false); // Close drawer on success
		} catch (error: any) {
			console.error("Failed to parse or save event:", error);
			// TODO: Show error toast to user using Sonner
			// toast.error(`Failed to add event: ${error.message}`);
		} finally {
			setIsSubmitting(false);
		}
	}, [eventInputText]);

	// handleOpenDrawer no longer needs to set specific fields, just open
	const handleOpenDrawer = useCallback((_date: Date | null) => {
		// date parameter is currently unused, but kept for potential future use
		// (e.g., pre-filling based on day clicked)
		setIsDrawerOpen(true);
		// Focus management might be needed here for the TextArea
	}, []);

	// Update handleDrawerOpenChange to reset the text input
	const handleDrawerOpenChange = (open: boolean) => {
		setIsDrawerOpen(open);
		if (!open) {
			// Reset state when drawer closes
			setEventInputText("");
			setIsSubmitting(false); // Ensure submitting state is reset
		}
	};

	// --- UI Helper Logic (mostly unchanged) ---
	const updateHeaders = useCallback(
		(index: number) => {
			if (index < 0 || index >= totalDays) return;
			const topDate = addDays(startDate, index);
			const year = getYear(topDate);
			const month = format(topDate, "MMMM");
			setCurrentYear(prevYear => (year !== prevYear ? year : prevYear));
			setCurrentMonth(prevMonth => (month !== prevMonth ? month : prevMonth));
		},
		[startDate, totalDays]
	);

	const handleScrollToToday = () => {
		if (virtuosoRef.current) {
			virtuosoRef.current.scrollToIndex({ index: todayIndex, align: "center", behavior: "smooth" });
		}
	};
	const isTodayVisible = visibleRange.start <= todayIndex && todayIndex <= visibleRange.end;
	// --- End UI Helpers ---

	return (
		<Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
			<Box style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
				{/* Sticky Headers */}

				<Box
					style={{
						position: "sticky",
						top: 0,
						background: "var(--color-background)",
						zIndex: 10,
						padding: "var(--space-3) var(--space-4)",
						borderBottom: "1px solid var(--gray-a5)",
						maxWidth: "var(--container-1)",
						width: "100%",
					}}
					mx={"auto"}
				>
					<Heading size="8" as="h1" mb="1" trim="start">
						{currentYear}
					</Heading>
					<Text size="5" as="p" color="gray" trim="start">
						{currentMonth}
					</Text>
				</Box>

				{/* Scrollable List Container */}
				<Box style={{ flexGrow: 1, position: "relative" }}>
					<Virtuoso
						ref={virtuosoRef}
						style={{ height: "100%" }}
						totalCount={totalDays}
						initialTopMostItemIndex={{ index: initialIndex, align: "center" }}
						itemContent={index => {
							const currentDate = addDays(startDate, index);
							// Use the updated helper function
							const activeEventsForDay = getEventsForDate(currentDate, events);
							const currentItemMonth = getMonth(currentDate);
							const currentItemYear = getYear(currentDate);
							let showYearHeader = false;
							let showMonthHeader = false;
							if (index === 0) {
								showYearHeader = true;
								showMonthHeader = true;
							} else {
								const previousDate = addDays(startDate, index - 1);
								const previousMonth = getMonth(previousDate);
								const previousYear = getYear(previousDate);
								if (currentItemYear !== previousYear) {
									showYearHeader = true;
									showMonthHeader = true;
								} else if (currentItemMonth !== previousMonth) {
									showMonthHeader = true;
								}
							}
							return (
								<>
									<Container size="1">
										{showYearHeader && (
											<Box px="2" pt="4" pb="1">
												{" "}
												<Heading size="6" my="1">
													{format(currentDate, "yyyy")}
												</Heading>{" "}
											</Box>
										)}
										{showMonthHeader && (
											<Box px="2" pt={showYearHeader ? "0" : "3"} pb="1">
												{" "}
												<Text
													size="4"
													weight="bold"
													color="gray"
													my="1"
												>
													{format(currentDate, "MMMM")}
												</Text>{" "}
											</Box>
										)}

										<DayRow
											date={currentDate}
											activeEvents={activeEventsForDay}
											onDayClick={() => handleOpenDrawer(null)}
										/>
									</Container>
								</>
							);
						}}
						rangeChanged={range => {
							updateHeaders(range.startIndex);
							setVisibleRange({ start: range.startIndex, end: range.endIndex });
						}}
						isScrolling={setIsScrolling}
					/>

					{/* Floating Today Button */}
					{!isTodayVisible && (
						<Button
							variant="solid"
							size="3"
							onClick={handleScrollToToday}
							style={{
								position: "fixed",
								bottom: 100,
								right: 32,
								zIndex: 20, // Lower zIndex than drawer
								boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
							}}
						>
							Go to Today
						</Button>
					)}

					{/* FAB to Trigger Drawer */}
					<DrawerTrigger asChild>
						<Button
							size="4"
							variant="solid"
							color="blue"
							aria-label="Add new event"
							style={{
								position: "fixed",
								bottom: 32,
								right: 32,
								zIndex: 20, // Lower zIndex than drawer
								borderRadius: "50%",
								width: 56,
								height: 56,
								padding: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
							}}
							onClick={() => handleOpenDrawer(null)} // Pass null for generic add
						>
							<IconPlus size={24} />
						</Button>
					</DrawerTrigger>
				</Box>

				{/* --- Minimal Drawer Content --- */}
				<BottomDrawerContent
					style={{
						maxWidth: 600,
						margin: "0 auto",
						paddingBottom: "env(safe-area-inset-bottom)" /* Add padding for notch */,
					}}
				>
					{/* Simplified form area */}
					<Flex
						position="relative"
						direction="column"
						gap="3"
						px="4"
						mb="4"
						style={{ flexGrow: 1 }}
					>
						{/* Remove label */}
						<TextArea
							placeholder="Create a new event..."
							value={eventInputText}
							onChange={e => setEventInputText(e.target.value)}
							size="3" // Increase text size
							rows={4} // Keep rows or adjust as needed
							style={{
								width: "100%",
								fontSize: "1.4rem",
								flexGrow: 1, // Allow textarea to grow
								border: "none", // Remove border
								resize: "none", // Disable manual resize handle
								boxShadow: "none", // Remove default shadow
								outline: "none", // Remove default outline
							}}
							autoFocus // Autofocus when drawer opens
						/>

						<Button
							variant="solid"
							color="blue"
							onClick={handleDrawerSave}
							disabled={!eventInputText.trim() || isSubmitting}
							aria-label="Add Event"
						></Button>

						<Box position="absolute" right="0" bottom="24px">
							{/* Remove DrawerClose Button */}
							<IconButton
								variant="solid" // Keep solid variant
								color="blue" // Keep blue color
								radius="full" // Make it circular
								size="3" // Adjust size if needed
								onClick={handleDrawerSave}
								disabled={!eventInputText.trim() || isSubmitting}
								aria-label="Add Event"
								style={{
									borderRadius: "50%",
									padding: 8,
								}}
							>
								{isSubmitting ? (
									<Spinner size="3" />
								) : (
									<IconArrowUp size={20} strokeWidth={2.5} />
								)}
							</IconButton>
						</Box>
					</Flex>

					<DrawerFooter></DrawerFooter>
				</BottomDrawerContent>
				{/* --- End Drawer Content --- */}
			</Box>
		</Drawer>
	);
}
