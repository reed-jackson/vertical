"use client"; // Dialog needs client-side state

import { format, isWeekend, isToday } from "date-fns";
import { TextField, Dialog, Button, Flex, Select, Text } from "@radix-ui/themes";
import { useState } from "react";

interface DayRowProps {
	date: Date;
	events?: string[]; // <-- Add optional events prop
	onSave: (date: Date, title: string, recurrence: string) => void; // <-- Add onSave prop type
}

const recurrenceOptions = [
	{ value: "none", label: "None" },
	{ value: "weekly", label: "Weekly" },
	{ value: "bi-weekly", label: "Bi-weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "quarterly", label: "Quarterly" },
	{ value: "semi-annually", label: "Semi-annually" },
	{ value: "annually", label: "Annually" },
];

export function DayRow({ date, events, onSave }: DayRowProps) {
	const [open, setOpen] = useState(false);
	const [eventTitle, setEventTitle] = useState("");
	const [recurrence, setRecurrence] = useState("none");

	const isWeekendDay = isWeekend(date);
	const isTodayDate = isToday(date);
	const dayOfMonth = format(date, "d");
	const dayOfWeek = format(date, "EEEE");
	const fullDateStr = format(date, "MMMM d, yyyy");
	const dateKey = format(date, "yyyy-MM-dd"); // For event handling

	const handleSave = () => {
		if (!eventTitle.trim()) return; // Prevent saving empty titles

		// Call the onSave prop passed from VertiCal
		onSave(date, eventTitle.trim(), recurrence);

		setOpen(false); // Close dialog
		setEventTitle(""); // Clear input
		setRecurrence("none"); // Reset recurrence
	};

	// Format events for display
	const eventsDisplay = events && events.length > 0 ? events.join(", ") : "";

	return (
		<Dialog.Root open={open} onOpenChange={setOpen}>
			<Dialog.Trigger>
				<div
					role="button"
					tabIndex={0} // Make it focusable
					className={`
						py-2 px-2 flex items-center gap-4 cursor-pointer 
						hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded 
						${isWeekendDay ? "ml-8" : "ml-2"}
						${isTodayDate ? "bg-blue-50 hover:bg-blue-100" : ""}
						relative
					`}
					aria-label={`Add event for ${fullDateStr}`}
					style={{ minHeight: "40px" }} // Ensure minimum row height
					// onClick={() => setOpen(true)} // Handled by Dialog.Trigger
					onKeyDown={e => {
						if (e.key === "Enter" || e.key === " ") setOpen(true);
					}} // Keyboard accessibility
				>
					<div className="w-8 text-right text-sm text-gray-700 relative">
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
					<div className="flex-grow text-sm italic text-gray-600 truncate">{eventsDisplay}</div>
				</div>
			</Dialog.Trigger>

			<Dialog.Content style={{ maxWidth: 450 }}>
				<Dialog.Title>Add Event for {fullDateStr}</Dialog.Title>
				<Dialog.Description size="2" mb="4">
					Enter the event details below.
				</Dialog.Description>

				<Flex direction="column" gap="3">
					<label>
						<Text as="div" size="2" mb="1" weight="bold">
							Event Title
						</Text>
						<TextField.Root
							placeholder="e.g., Meeting with Alex"
							value={eventTitle}
							onChange={e => setEventTitle(e.target.value)}
							autoFocus
						/>
					</label>
					<label>
						<Text as="div" size="2" mb="1" weight="bold">
							Recurrence
						</Text>
						<Select.Root value={recurrence} onValueChange={setRecurrence}>
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
						<Button variant="soft" color="gray">
							Cancel
						</Button>
					</Dialog.Close>
					<Button onClick={handleSave} disabled={!eventTitle.trim()}>
						Save
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
}
