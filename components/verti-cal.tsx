"use client";

import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { DayRow } from "./day-row";
import { startOfDay, addDays, differenceInDays, parseISO, format, getYear, getMonth, isToday } from "date-fns";
import { useMemo, useState, useCallback, useRef } from "react";
import { Box, Heading, Text, Button, Dialog, Flex, TextField, Select } from "@radix-ui/themes";
import { IconPlus } from "@tabler/icons-react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Initial dummy data
const initialDummyEvents = new Map<string, string[]>();
initialDummyEvents.set("2025-04-15", ["Meeting with Alex"]);
initialDummyEvents.set("2025-04-17", ["Project deadline", "Team lunch"]);
initialDummyEvents.set("2025-05-01", ["May Day"]);

// Define the start and end dates for the calendar range
const START_DATE_STR = "1970-01-01";
const END_DATE_STR = "2100-12-31";
// Define the target date for centering (as per rules)
const TARGET_DATE_STR = "2025-04-15";

const recurrenceOptions = [
	{ value: "none", label: "None" },
	{ value: "weekly", label: "Weekly" },
	{ value: "bi-weekly", label: "Bi-weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "quarterly", label: "Quarterly" },
	{ value: "semi-annually", label: "Semi-annually" },
	{ value: "annually", label: "Annually" },
];

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
	const [events, setEvents] = useState(new Map(initialDummyEvents));

	const handleSaveEvent = useCallback((date: Date | null, title: string, recurrence: string) => {
		if (!date || !title.trim()) return;

		const dateKey = format(date, "yyyy-MM-dd");
		console.log(`Saving event (state): ${dateKey}, Title: ${title}, Recurrence: ${recurrence}`);
		setEvents(prevEvents => {
			const newEvents = new Map(prevEvents);
			const existingEvents = newEvents.get(dateKey) || [];
			if (!existingEvents.includes(title)) {
				newEvents.set(dateKey, [...existingEvents, title]);
			}
			return newEvents;
		});
	}, []);
	// --- End State Management ---

	// --- State for Sticky Headers and "Today" Button ---
	const [currentYear, setCurrentYear] = useState<number>(getYear(targetDate));
	const [currentMonth, setCurrentMonth] = useState<string>(format(targetDate, "MMMM"));
	const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({
		start: initialIndex,
		end: initialIndex,
	});

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
	// --- End Header/Today State ---

	// --- State for FAB Modal ---
	const [isFabModalOpen, setIsFabModalOpen] = useState(false);
	const [fabSelectedDate, setFabSelectedDate] = useState<Date | null>(new Date());
	const [fabEventTitle, setFabEventTitle] = useState("");
	const [fabRecurrence, setFabRecurrence] = useState("none");

	const handleFabSave = () => {
		handleSaveEvent(fabSelectedDate, fabEventTitle, fabRecurrence);
		setIsFabModalOpen(false);
		setFabEventTitle("");
		setFabRecurrence("none");
		setFabSelectedDate(new Date());
	};
	// --- End FAB Modal State ---

	return (
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
				}}
			>
				<Heading size="8" as="h1" mb="1" trim="start">
					{currentYear}
				</Heading>
				<Text size="5" as="p" color="gray" trim="start">
					{currentMonth}
				</Text>
			</Box>

			{/* Scrollable List Container - Takes remaining height */}
			<Box style={{ flexGrow: 1, position: "relative" }}>
				<Virtuoso
					ref={virtuosoRef}
					style={{ height: "100%" }}
					totalCount={totalDays}
					initialTopMostItemIndex={{
						index: initialIndex,
						align: "center",
					}}
					itemContent={index => {
						const currentDate = addDays(startDate, index);
						const currentItemMonth = getMonth(currentDate);
						const currentItemYear = getYear(currentDate);

						const dateKey = format(currentDate, "yyyy-MM-dd");
						const eventsForDay = events.get(dateKey);

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
								{showYearHeader && (
									<Box px="2" pt="4" pb="1">
										<Heading size="6" my="1">
											{format(currentDate, "yyyy")}
										</Heading>
									</Box>
								)}
								{showMonthHeader && (
									<Box px="2" pt={showYearHeader ? "0" : "3"} pb="1">
										<Text size="4" weight="bold" color="gray" my="1">
											{format(currentDate, "MMMM")}
										</Text>
									</Box>
								)}
								<DayRow
									date={currentDate}
									events={eventsForDay}
									onSave={handleSaveEvent}
								/>
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
						style={{
							position: "fixed",
							bottom: 100,
							right: 32,
							zIndex: 50,
							boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
						}}
						onClick={handleScrollToToday}
					>
						Go to Today
					</Button>
				)}

				{/* FAB to Add Event */}
				<Dialog.Root open={isFabModalOpen} onOpenChange={setIsFabModalOpen}>
					<Dialog.Trigger>
						<Button
							size="4"
							variant="solid"
							color="blue"
							style={{
								position: "fixed",
								bottom: 32,
								right: 32,
								zIndex: 50,
								borderRadius: "50%",
								width: 56,
								height: 56,
								boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
								padding: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
							aria-label="Add new event"
						>
							<IconPlus size={24} />
						</Button>
					</Dialog.Trigger>

					<Dialog.Content style={{ maxWidth: 450 }}>
						<Dialog.Title>Add New Event</Dialog.Title>
						<Dialog.Description size="2" mb="4">
							Select a date and enter the event details.
						</Dialog.Description>

						<Flex direction="column" gap="3">
							<label>
								<Text as="div" size="2" mb="1" weight="bold">
									Date
								</Text>
								<ReactDatePicker
									selected={fabSelectedDate}
									onChange={date => setFabSelectedDate(date)}
									dateFormat="MMMM d, yyyy"
									customInput={<TextField.Root />}
									popperPlacement="top-start"
								/>
							</label>
							<label>
								<Text as="div" size="2" mb="1" weight="bold">
									Event Title
								</Text>
								<TextField.Root
									placeholder="e.g., Dentist Appointment"
									value={fabEventTitle}
									onChange={e => setFabEventTitle(e.target.value)}
								/>
							</label>
							<label>
								<Text as="div" size="2" mb="1" weight="bold">
									Recurrence
								</Text>
								<Select.Root value={fabRecurrence} onValueChange={setFabRecurrence}>
									<Select.Trigger />
									<Select.Content>
										{recurrenceOptions.map(option => (
											<Select.Item key={option.value} value={option.value}>
												{option.label}
											</Select.Item>
										))}
									</Select.Content>
								</Select.Root>
							</label>
						</Flex>

						<Flex gap="3" mt="4" justify="end">
							<Dialog.Close>
								<Button
									variant="soft"
									color="gray"
									onClick={() => {
										setFabEventTitle("");
										setFabRecurrence("none");
										setFabSelectedDate(new Date());
									}}
								>
									Cancel
								</Button>
							</Dialog.Close>
							<Button
								onClick={handleFabSave}
								disabled={!fabSelectedDate || !fabEventTitle.trim()}
							>
								Save
							</Button>
						</Flex>
					</Dialog.Content>
				</Dialog.Root>
			</Box>
		</Box>
	);
}
