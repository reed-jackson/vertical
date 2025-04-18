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
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
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
	Tooltip,
	Grid,
	Checkbox,
	Separator,
} from "@radix-ui/themes";
import { IconArrowUp, IconCalendarDown, IconCalendarUp, IconPlus, IconSearch, IconTrash } from "@tabler/icons-react";
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

// Define the start and end dates for the calendar range
const START_DATE_STR = "1970-01-01";
const END_DATE_STR = "2100-12-31";
// Define the target date for centering (as per rules)
const TARGET_DATE_STR = "2025-04-15";

// Define recurrence options for the Select input
const recurrenceOptions = [
	{ value: "none", label: "Does not repeat" },
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

// Updated helper function to get events for a specific date
// NOTE: This function's performance depends heavily on the size of allEvents.
// Consider optimizing data fetching or this function if performance degrades.
function getEventsForDate(targetDate: Date, allEvents: CalendarEvent[]): ActiveEventInfo[] {
	const activeEvents: ActiveEventInfo[] = [];

	// Iterate over the flat array of all events
	allEvents.forEach(event => {
		// Basic validation using new field names
		if (!event || !event.title || !event.event_date) return;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(event.event_date)) return;

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
			if (!/^\d{4}-\d{2}-\d{2}$/.test(event.event_end_date)) return; // Skip invalid format
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
	const [events, setEvents] = useState<CalendarEvent[]>([]);
	const [fetchError, setFetchError] = useState<string | null>(null); // Error state

	// --- State for Sticky Headers and "Today" Button ---
	const [currentYear, setCurrentYear] = useState<number>(getYear(targetDate));
	const [currentMonth, setCurrentMonth] = useState<string>(format(targetDate, "MMMM"));
	const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
		start: initialIndex,
		end: initialIndex,
	});

	// --- State for Event Form in Bottom Drawer ---
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null); // Track the event being edited
	const [eventInputText, setEventInputText] = useState(""); // Title / Quick Add Text
	const [eventStartDateStr, setEventStartDateStr] = useState(""); // YYYY-MM-DD
	const [eventEndDateStr, setEventEndDateStr] = useState(""); // YYYY-MM-DD
	const [useEndDate, setUseEndDate] = useState(false); // Toggle for end date input
	const [recurringType, setRecurringType] = useState<CalendarEvent["recurring_type"]>("none");
	const [recurringInterval, setRecurringInterval] = useState<number>(1);
	const [recurringEndDateStr, setRecurringEndDateStr] = useState(""); // YYYY-MM-DD
	const [useRecurringEndDate, setUseRecurringEndDate] = useState(false); // Toggle for recurring end date

	const [isSubmitting, setIsSubmitting] = useState(false); // To disable button during API call
	const [formError, setFormError] = useState<string | null>(null); // To display errors in the drawer

	// --- Function to reset form state ---
	const resetFormState = useCallback(() => {
		setEditingEvent(null);
		setEventInputText("");
		setEventStartDateStr("");
		setEventEndDateStr("");
		setUseEndDate(false);
		setRecurringType("none");
		setRecurringInterval(1);
		setRecurringEndDateStr("");
		setUseRecurringEndDate(false);
		setFormError(null);
		setIsSubmitting(false);
	}, []);

	// --- Function to fetch events from API ---
	const fetchEvents = useCallback(async () => {
		setFetchError(null);
		try {
			const response = await fetch("/api/events");
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || `Failed to fetch events: ${response.statusText}`);
			}
			const fetchedEvents: CalendarEvent[] = await response.json();
			// Convert the Map-based structure to a simple array if needed,
			// or adjust getEventsForDate to handle the map.
			// Assuming API returns CalendarEvent[] directly.
			console.log("Fetched events:", fetchedEvents);
			setEvents(fetchedEvents);
		} catch (error: any) {
			console.error("Failed to fetch events:", error);
			setFetchError(error.message);
		}
	}, []);

	// --- Fetch events on initial mount ---
	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]); // fetchEvents is stable due to useCallback

	// --- Event Handling Logic (Updated for API call) ---
	const handleDrawerSave = useCallback(async () => {
		setFormError(null);
		setIsSubmitting(true);

		// Basic validation
		const title = eventInputText.trim();
		if (!title) {
			setFormError("Title is required.");
			setIsSubmitting(false);
			return;
		}
		if (editingEvent && !eventStartDateStr) {
			setFormError("Start date is required for editing.");
			setIsSubmitting(false);
			return;
		}
		if (editingEvent && !/^\d{4}-\d{2}-\d{2}$/.test(eventStartDateStr)) {
			setFormError("Invalid start date format (YYYY-MM-DD).");
			setIsSubmitting(false);
			return;
		}
		const finalEndDate =
			useEndDate && eventEndDateStr && /^\d{4}-\d{2}-\d{2}$/.test(eventEndDateStr)
				? eventEndDateStr
				: undefined;
		const finalRecurringEndDate =
			useRecurringEndDate && recurringEndDateStr && /^\d{4}-\d{2}-\d{2}$/.test(recurringEndDateStr)
				? recurringEndDateStr
				: undefined;

		try {
			let savedEvent: CalendarEvent | null = null;
			let response: Response;

			if (editingEvent) {
				// --- UPDATE existing event ---
				const updatedEventData: Partial<CalendarEvent> = {
					title: title,
					event_date: eventStartDateStr,
					event_end_date: finalEndDate,
					recurring_type: recurringType === "none" ? undefined : recurringType,
					recurring_interval:
						recurringType !== "none" ? Math.max(1, recurringInterval || 1) : undefined,
					recurring_end_date: finalRecurringEndDate,
					// id is already present in editingEvent
				};

				response = await fetch(`/api/events?id=${editingEvent.id}`, {
					method: "PUT", // Or PATCH if your API supports partial updates
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updatedEventData),
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || `Update API Error: ${response.statusText}`);
				}
				savedEvent = await response.json(); // Assuming API returns the updated event

				// Update local state
				setEvents(prevEvents => prevEvents.map(ev => (ev.id === savedEvent!.id ? savedEvent! : ev)));
			} else {
				// --- CREATE new event (using parse API) ---
				response = await fetch("/api/events/parse", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text: title }), // Send only the text for parsing
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || `Parse API Error: ${response.statusText}`);
				}
				savedEvent = await response.json(); // API returns the full event object after parsing/saving

				// Basic validation of the parsed event (optional, but good practice)
				if (
					!savedEvent ||
					!savedEvent.id ||
					!savedEvent.title ||
					!savedEvent.event_date ||
					!isValid(parseISO(savedEvent.event_date))
				) {
					console.error("Received invalid event data from parse API:", savedEvent);
					throw new Error("Received invalid event data from parse API.");
				}

				// Update local state
				setEvents(prevEvents => [...prevEvents, savedEvent!]);
			}

			setIsDrawerOpen(false); // Close drawer on success
			// Form state is reset via handleDrawerOpenChange
		} catch (error: any) {
			console.error("Failed to save event:", error);
			setFormError(error.message || "Failed to save event.");
			// Don't close drawer on error
		} finally {
			setIsSubmitting(false);
		}
	}, [
		editingEvent,
		eventInputText,
		eventStartDateStr,
		eventEndDateStr,
		useEndDate,
		recurringType,
		recurringInterval,
		recurringEndDateStr,
		useRecurringEndDate,
		// fetchEvents is not needed here as we update state directly
	]);

	const handleEventDelete = useCallback(
		async (eventId?: string) => {
			const idToDelete = eventId ?? editingEvent?.id; // Use passed ID or ID from editing state
			if (!idToDelete) return;

			// Optional: Add confirmation dialog here

			setIsSubmitting(true); // Reuse submitting state for delete action
			try {
				const response = await fetch(`/api/events?id=${idToDelete}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.message || "Failed to delete event");
				}

				// Only update UI if delete was successful
				setEvents(prevEvents => prevEvents.filter(ev => ev.id !== idToDelete));
				setIsDrawerOpen(false); // Close drawer after deleting
				// Form state is reset via handleDrawerOpenChange
			} catch (error: any) {
				console.error("Delete error:", error);
				setFormError(error.message || "Failed to delete event.");
				// Keep drawer open to show error
			} finally {
				// Only reset submitting if we didn't successfully close the drawer
				if (isDrawerOpen) {
					setIsSubmitting(false);
				}
			}
		},
		[editingEvent, isDrawerOpen]
	); // Depend on editingEvent to get ID if not passed

	// --- Drawer Opening Handlers ---

	// Called when clicking a day or the FAB (+)
	const handleOpenNewEventDrawer = useCallback(
		(date: Date | null) => {
			resetFormState(); // Clear any previous editing state
			const initialDate = date ? format(date, "yyyy-MM-dd") : format(today, "yyyy-MM-dd");
			// For quick add, we only prefill the text area initially if a date is clicked?
			// Let's keep it simple: only open the drawer. User types the text.
			// If we wanted date prefill for text parsing, API would need to handle it.
			// If using full form for new events too, prefill date:
			// setEventStartDateStr(initialDate);
			setIsDrawerOpen(true);
		},
		[resetFormState, today]
	);

	// Called when clicking an existing event in DayRow
	const handleOpenEditDrawer = useCallback(
		(event: CalendarEvent) => {
			resetFormState(); // Start fresh
			setEditingEvent(event);
			setEventInputText(event.title);
			setEventStartDateStr(event.event_date); // Assuming YYYY-MM-DD format from DB
			if (event.event_end_date) {
				setEventEndDateStr(event.event_end_date);
				setUseEndDate(true);
			} else {
				setUseEndDate(false);
				setEventEndDateStr("");
			}
			setRecurringType(event.recurring_type || "none");
			setRecurringInterval(event.recurring_interval || 1);
			if (event.recurring_end_date) {
				setRecurringEndDateStr(event.recurring_end_date);
				setUseRecurringEndDate(true);
			} else {
				setUseRecurringEndDate(false);
				setRecurringEndDateStr("");
			}
			setIsDrawerOpen(true);
		},
		[resetFormState]
	);

	// Update handleDrawerOpenChange to reset form state on close
	const handleDrawerOpenChange = (open: boolean) => {
		setIsDrawerOpen(open);
		if (!open) {
			resetFormState(); // Reset all form fields and editing state
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
	const isTodayInFuture = todayIndex > visibleRange.end;
	const isTodayInPast = todayIndex < visibleRange.start;
	// --- End UI Helpers ---

	// --- Render Loading/Error States ---
	if (fetchError) {
		return (
			<Flex justify="center" align="center" style={{ height: "100vh" }}>
				<Text color="red">Error loading events: {fetchError}</Text>
				{/* Optionally add a retry button */}
				<Button onClick={fetchEvents} ml="3">
					Retry
				</Button>
			</Flex>
		);
	}
	// --- End Loading/Error States ---

	return (
		<Drawer open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
			<Box style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
				{/* Sticky Headers */}

				<Box className="header-container" mx={"auto"}>
					<Heading size="7" as="h1" mb="1" trim="start">
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
											<Box px="4" pt="4" pb="1">
												{" "}
												<Heading size="7" my="1">
													{format(currentDate, "yyyy")}
												</Heading>{" "}
											</Box>
										)}
										{showMonthHeader && (
											<Box px="4" pt={showYearHeader ? "0" : "3"} pb="1">
												{" "}
												<Text size="5" color="gray" my="1">
													{format(currentDate, "MMMM")}
												</Text>{" "}
											</Box>
										)}

										<DayRow
											date={currentDate}
											activeEvents={activeEventsForDay}
											onDayClick={handleOpenNewEventDrawer}
											onEventDelete={handleEventDelete}
											onEventClick={handleOpenEditDrawer}
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

					{/* Floating Action Buttons Container */}
					<Flex
						direction="column-reverse" // Stack items upwards
						align="center" // Align to the right
						gap="6" // Space between buttons
						className="floating-action-container"
					>
						{/* FAB to Trigger Drawer (Bottommost) */}
						<Button
							size="4"
							variant="outline"
							radius="full"
							aria-label="Add new event"
							style={{
								borderRadius: "50%",
								width: 56,
								height: 56,
								padding: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							onClick={() => handleOpenNewEventDrawer(null)}
						>
							<IconPlus size={24} />
						</Button>

						{/* Floating Search Button */}
						<IconButton
							variant="ghost"
							size="4"
							radius="full"
							color="gray"
							aria-label="Search events"
							// onClick={() => { /* Add search logic later */ }}
							style={
								{
									// Optional: Add some styling if needed, ghost usually doesn't need much
									// backgroundColor: 'var(--color-background-alpha)', // Slight background maybe?
									// backdropFilter: 'blur(4px)',
								}
							}
						>
							<IconSearch size={20} />
						</IconButton>

						{/* Floating Today Button (Conditional, above FAB) */}
						{(isTodayInFuture || isTodayInPast) && (
							<Tooltip content={"Return to Today"} side="left">
								<IconButton
									variant="ghost"
									size="4"
									radius="full"
									color="gray"
									aria-label="Scroll to today"
									onClick={handleScrollToToday}
								>
									{isTodayInFuture ? (
										<IconCalendarDown size="20" />
									) : (
										<IconCalendarUp size="20" />
									)}
								</IconButton>
							</Tooltip>
						)}
					</Flex>
				</Box>

				{/* --- Updated Drawer Content --- */}
				<BottomDrawerContent
					isEditing={!!editingEvent}
					style={{
						maxWidth: 600,
						margin: "0 auto",
						paddingBottom: "env(safe-area-inset-bottom)",
					}}
				>
					<Flex direction="column" gap="3" px="4" pb="2" style={{ flexGrow: 1 }}>
						{/* --- Form Area --- */}
						{editingEvent ? (
							// --- Full Edit Form ---
							<Grid columns={{ initial: "1", sm: "2" }} gap="3" width="100%">
								{/* Title (spans 2 columns) */}
								<Box style={{ gridColumn: "1 / -1" }}>
									<Text
										as="label"
										size="2"
										weight="bold"
										mb="1"
										htmlFor="event-title"
									>
										Event Title
									</Text>
									<TextArea
										id="event-title"
										placeholder="Event Title"
										value={eventInputText}
										onChange={e => setEventInputText(e.target.value)}
										size="3"
										rows={1} // Keep it visually single-line initially if desired
										style={{ width: "100%", fontSize: "1.1rem" }}
										autoFocus
									/>
								</Box>

								{/* Start Date */}
								<Box>
									<Text
										as="label"
										size="2"
										weight="bold"
										mb="1"
										htmlFor="start-date"
									>
										Start Date
									</Text>
									<TextField.Root
										id="start-date"
										type="date"
										value={eventStartDateStr}
										onChange={e => setEventStartDateStr(e.target.value)}
										required
									/>
								</Box>

								{/* End Date (Optional) */}
								<Box>
									<Flex justify="between" align="center" mb="1">
										<Text as="label" size="2" weight="bold" htmlFor="end-date">
											End Date
										</Text>
										<Flex gap="2" align="center" asChild>
											<label
												htmlFor="use-end-date"
												style={{ cursor: "pointer" }}
											>
												<Checkbox
													id="use-end-date"
													checked={useEndDate}
													onCheckedChange={checked =>
														setUseEndDate(Boolean(checked))
													}
													size="1"
												/>
												<Text size="1">Enable</Text>
											</label>
										</Flex>
									</Flex>
									<TextField.Root
										id="end-date"
										type="date"
										value={eventEndDateStr}
										onChange={e => setEventEndDateStr(e.target.value)}
										disabled={!useEndDate}
									/>
								</Box>

								<Box style={{ gridColumn: "1 / -1" }}>
									<Separator my="2" size="4" />
								</Box>

								{/* Recurrence Type */}
								<Box>
									<Text
										as="label"
										size="2"
										weight="bold"
										mb="1"
										htmlFor="recurrence-type"
									>
										Repeats
									</Text>
									<Select.Root
										value={recurringType || "none"}
										onValueChange={value =>
											setRecurringType(
												value as CalendarEvent["recurring_type"]
											)
										}
									>
										<Select.Trigger
											id="recurrence-type"
											placeholder="Does not repeat"
										/>
										<Select.Content>
											{recurrenceOptions.map(opt => (
												<Select.Item key={opt.value} value={opt.value}>
													{opt.label}
												</Select.Item>
											))}
										</Select.Content>
									</Select.Root>
								</Box>

								{/* Recurrence Interval (Conditional) */}
								<Box
									style={{
										visibility: recurringType !== "none" ? "visible" : "hidden",
									}}
								>
									<Text
										as="label"
										size="2"
										weight="bold"
										mb="1"
										htmlFor="recurrence-interval"
									>
										Every
									</Text>
									<TextField.Root
										id="recurrence-interval"
										type="number"
										min="1"
										value={String(recurringInterval)}
										onChange={e =>
											setRecurringInterval(
												Math.max(1, parseInt(e.target.value, 10) || 1)
											)
										}
										disabled={recurringType === "none"}
									>
										<TextField.Slot>
											<Text size="1">
												{" "}
												{recurringType?.replace("ly", "")}
												{recurringInterval > 1 ? "s" : ""}{" "}
											</Text>
										</TextField.Slot>
									</TextField.Root>
								</Box>

								{/* Recurring End Date (Optional & Conditional) */}
								<Box
									style={{
										gridColumn: "1 / -1",
										visibility: recurringType !== "none" ? "visible" : "hidden",
									}}
								>
									<Flex justify="between" align="center" mb="1">
										<Text
											as="label"
											size="2"
											weight="bold"
											htmlFor="recurring-end-date"
										>
											Until
										</Text>
										<Flex gap="2" align="center" asChild>
											<label
												htmlFor="use-recurring-end-date"
												style={{ cursor: "pointer" }}
											>
												<Checkbox
													id="use-recurring-end-date"
													checked={useRecurringEndDate}
													onCheckedChange={checked =>
														setUseRecurringEndDate(
															Boolean(checked)
														)
													}
													size="1"
												/>
												<Text size="1">Set End Date</Text>
											</label>
										</Flex>
									</Flex>
									<TextField.Root
										id="recurring-end-date"
										type="date"
										value={recurringEndDateStr}
										onChange={e => setRecurringEndDateStr(e.target.value)}
										disabled={!useRecurringEndDate || recurringType === "none"}
									/>
								</Box>

								{/* Action Buttons within the Edit Form Grid */}
								<Flex
									justify="between"
									align="center"
									style={{ gridColumn: "1 / -1" }}
									mt="4"
								>
									{/* Delete Button */}
									<IconButton
										variant="ghost"
										color="red"
										aria-label="Delete Event"
										onClick={() => handleEventDelete()} // No ID needed, uses editingEvent state
										disabled={isSubmitting}
										size="3"
									>
										<IconTrash />
									</IconButton>
									{/* Update Button */}
									<Button
										onClick={handleDrawerSave}
										disabled={!eventInputText.trim() || isSubmitting}
										aria-label="Update Event"
										size="3"
									>
										{isSubmitting ? <Spinner size="3" /> : "Update Event"}
									</Button>
								</Flex>
							</Grid>
						) : (
							// --- Quick Add Text Area ---
							<Flex
								direction="column"
								gap="2"
								style={{ flexGrow: 1, position: "relative" }}
							>
								<TextArea
									placeholder="Create a new event..."
									value={eventInputText}
									onChange={e => setEventInputText(e.target.value)}
									size="3"
									rows={4}
									style={{
										width: "100%",
										fontSize: "1.4rem",
										flexGrow: 1,
										border: "none",
										resize: "none",
										boxShadow: "none",
										outline: "none",
										paddingRight: "48px", // Add padding to avoid overlap with button
									}}
									onKeyDown={e => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleDrawerSave();
										}
									}}
									autoFocus
								/>
								{/* Quick Add Submit Button */}
								<Box position="absolute" right="0" bottom="0" pb="1" pr="1">
									{" "}
									{/* Adjust positioning */}
									<IconButton
										variant="solid"
										color="blue"
										radius="full"
										size="3"
										onClick={handleDrawerSave}
										disabled={!eventInputText.trim() || isSubmitting}
										aria-label="Add Event"
									>
										{isSubmitting ? (
											<Spinner size="3" />
										) : (
											<IconArrowUp size={20} strokeWidth={2.5} />
										)}
									</IconButton>
								</Box>
							</Flex>
						)}

						{/* Form Error Display */}
						{formError && (
							<Text color="red" size="2" mt="2">
								{formError}
							</Text>
						)}
					</Flex>
				</BottomDrawerContent>
				{/* --- End Drawer Content --- */}
			</Box>
		</Drawer>
	);
}
