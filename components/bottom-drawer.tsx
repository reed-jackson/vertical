"use client";

import { Drawer as VaulDrawer, Handle as VaulHandle } from "vaul";
import { Box, Button } from "@radix-ui/themes";
import React from "react";

// Re-export vaul components for consistency in VertiCal
export const Drawer = VaulDrawer.Root;
export const DrawerTrigger = VaulDrawer.Trigger;
export const DrawerClose = VaulDrawer.Close;

interface BottomDrawerContentProps extends React.ComponentPropsWithoutRef<typeof VaulDrawer.Content> {
	// No custom props needed for now
}

// Custom Drawer Content using VaulDrawer.Content
export const BottomDrawerContent = React.forwardRef<
	React.ElementRef<typeof VaulDrawer.Content>,
	BottomDrawerContentProps
>(({ children, className, ...props }, ref) => (
	<VaulDrawer.Portal>
		{/* Overlay - vaul handles its own overlay */}
		<VaulDrawer.Overlay className="fixed inset-0 z-40 bg-white/60" />
		{/* Content - vaul handles dragging and animations, apply styling */}
		<VaulDrawer.Content
			ref={ref}
			className={`
                fixed bottom-0 left-0 right-0 z-50
                mt-24 flex h-auto max-h-[90vh] flex-col rounded-t-[10px]
                border-t border-gray-200 /* Light border */
                bg-white /* Explicit light background */
                p-6 pt-2 shadow-lg /* Keep padding and shadow */
                focus:outline-none /* Keep focus style */
                ${className ?? ""}
            `}
			{...props}
		>
			<VaulHandle />
			{/* Content area - vaul might manage overflow, but keep it safe */}
			<Box className="flex-1 overflow-y-auto text-gray-900">{children}</Box>
		</VaulDrawer.Content>
	</VaulDrawer.Portal>
));
BottomDrawerContent.displayName = "BottomDrawerContent";

// Optional: Header and Footer components for structure
export const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={`text-center sm:text-left mb-4 ${className ?? ""}`} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

export const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
	<Box
		className={`mt-auto flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className ?? ""}`}
		{...props}
	/>
);
DrawerFooter.displayName = "DrawerFooter";

// For Title/Description, continue using appropriate semantic elements or Radix components
// as vaul doesn't provide specific Drawer.Title/Drawer.Description exports.
// Example using basic h2/p or Radix Heading/Text within DrawerHeader/content:

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
