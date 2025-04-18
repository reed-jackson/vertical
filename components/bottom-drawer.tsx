"use client";

import { Drawer as VaulDrawer } from "vaul";
import { Box, VisuallyHidden } from "@radix-ui/themes";
import React from "react";

// Re-export vaul components for consistency in VertiCal
export const Drawer = VaulDrawer.Root;
export const DrawerTrigger = VaulDrawer.Trigger;
export const DrawerClose = VaulDrawer.Close;

// Define only your custom props here
interface CustomDrawerProps {
	isEditing?: boolean;
	snapPoints?: number[];
}

// Use an intersection type for the component's props
type BottomDrawerContentProps = React.ComponentPropsWithoutRef<typeof VaulDrawer.Content> & CustomDrawerProps;

// Custom Drawer Content using VaulDrawer.Content
export const BottomDrawerContent = React.forwardRef<
	React.ElementRef<typeof VaulDrawer.Content>,
	BottomDrawerContentProps
>(({ children, className, isEditing, snapPoints, ...props }, ref) => {
	// Destructure snapPoints here
	// Define default snap points based on editing state
	const defaultSnapPoints = isEditing ? [0.6, 0.9] : [0.25, 0.9]; // 60% or 25% initial, 90% max
	// Use provided snapPoints if available, otherwise use defaults
	const finalSnapPoints = snapPoints ?? defaultSnapPoints;

	return (
		<VaulDrawer.Portal>
			<VaulDrawer.Overlay className="fixed inset-0 z-40 bg-white/60" />
			<VaulDrawer.Content
				ref={ref}
				snapPoints={finalSnapPoints} // Pass the resolved snapPoints
				shouldScaleBackground
				className={`
                    fixed bottom-0 left-0 right-0 z-50
                    mt-24 flex flex-col rounded-t-[10px]
                    border-t border-r border-l border-gray-200
                    bg-white
                    focus:outline-none
                    /* Let height be controlled by snapPoints and content */
                    ${className ?? ""}
                `}
				{...props} // Pass remaining props (like shouldScaleBackground if needed)
			>
				<VisuallyHidden>
					<VaulDrawer.Title>Event Details</VaulDrawer.Title>
				</VisuallyHidden>
				{/* Wrapper for handle and padding */}
				<Box className="sticky top-0 bg-white pt-2 pb-4 px-6 z-10 rounded-t-[10px]">
					<Box className="mx-auto h-1.5 w-10 rounded-full bg-gray-300" /> {/* Handle */}
				</Box>
				{/* Scrollable content area with padding applied separately */}
				<Box className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 text-gray-900">
					{children}
				</Box>
			</VaulDrawer.Content>
		</VaulDrawer.Portal>
	);
});
BottomDrawerContent.displayName = "BottomDrawerContent";

// Optional: Header and Footer components for structure
export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={`text-center sm:text-left mb-4 ${className ?? ""}`} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

export const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<Box
		className={`sticky bottom-0 bg-white pt-4 pb-[max(env(safe-area-inset-bottom),theme(spacing.4))] px-6 border-t border-gray-200 mt-auto flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${
			className ?? ""
		}`}
		{...props}
	/>
);
DrawerFooter.displayName = "DrawerFooter";

// Keep DrawerTitle (using h2 or Radix Heading inside the content)
export const DrawerTitle = React.forwardRef<
	HTMLHeadingElement, // Use appropriate element type (e.g., h2)
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
	<h2
		ref={ref}
		className={`text-lg font-semibold leading-none tracking-tight text-gray-900 ${className ?? ""}`}
		{...props}
	>
		{children}
	</h2>
));
DrawerTitle.displayName = "DrawerTitle";

// Keep DrawerDescription (using p or Radix Text inside the content)
export const DrawerDescription = React.forwardRef<
	HTMLParagraphElement, // Use appropriate element type (e.g., p)
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
	<p ref={ref} className={`text-sm text-gray-500 ${className ?? ""}`} {...props}>
		{children}
	</p>
));
DrawerDescription.displayName = "DrawerDescription";
