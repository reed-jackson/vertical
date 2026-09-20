---
name: Vertical
description: A quiet, typographic private datebook for a vertical list of days.
colors:
  carbon-ink: "#111111"
  gallery-white: "#ffffff"
  signal-indigo: "#3e63dd"
  signal-indigo-deep: "#3451b2"
  ink-day: "#222222"
  ink-muted: "#767676"
  ink-time: "#8a8a8a"
  ink-meta: "#a0a0a0"
  paper-hover: "#f6f6f6"
  paper-muted: "#f3f3f3"
  paper-chip: "#f2f2f2"
  hairline: "#dfdfdf"
  border: "#e8e8e8"
  placeholder: "#b2b2b2"
  event-green: "#30a46c"
  event-red: "#e5484d"
  event-amber: "#e5a000"
  event-violet: "#8e4ec6"
  event-teal: "#12a594"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.045em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "18px"
    letterSpacing: "normal"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
rounded:
  row: "9px"
  field: "11px"
  button: "12px"
  md: "14px"
  sheet: "24px"
  full: "999px"
  circle: "50%"
spacing:
  event-gap: "2px"
  day-gutter: "7px"
  sm: "10px"
  md: "18px"
  lg: "24px"
  xl: "28px"
  weekend-indent: "24px"
  column: "24px"
  fab-offset: "22px"
components:
  button-primary:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.gallery-white}"
    rounded: "{rounded.button}"
    height: "42px"
    padding: "0 18px"
  button-primary-disabled:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.gallery-white}"
  fab-primary:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.gallery-white}"
    rounded: "{rounded.circle}"
    width: "52px"
    height: "52px"
  fab-secondary:
    backgroundColor: "rgba(255,255,255,.94)"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.circle}"
    width: "52px"
    height: "52px"
  field:
    backgroundColor: "{colors.gallery-white}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.field}"
    height: "40px"
    padding: "0 12px"
  title-input:
    backgroundColor: "transparent"
    textColor: "{colors.carbon-ink}"
    typography: "{typography.display}"
    rounded: "0"
    padding: "4px 0 14px"
  event-line:
    backgroundColor: "transparent"
    textColor: "{colors.signal-indigo}"
    typography: "{typography.body}"
    padding: "0"
  chip-suggestion:
    backgroundColor: "{colors.gallery-white}"
    textColor: "{colors.carbon-ink}"
    rounded: "{rounded.full}"
    padding: "8px 11px"
  today-mark:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.gallery-white}"
    rounded: "{rounded.circle}"
    width: "26px"
    height: "26px"
  weekday-selected:
    backgroundColor: "{colors.carbon-ink}"
    textColor: "{colors.gallery-white}"
    rounded: "{rounded.circle}"
    width: "32px"
    height: "32px"
---

# Design System: Vertical

## Overview

**Creative North Star: "The Private Datebook"**

Vertical looks like a private datebook opened to a list of days. The page is paper. The type is ink. There is almost no chrome. Month names, day numbers, and event titles do the work that other calendars give to grids, cards, and toolbars.

The system is quiet and typographic. Surfaces stay white. Actions are small, exact hardware: circular floating tools, hairline field capsules, and a sheet that rises only when a day needs an editor. Color on events is personal markup, not a brand skin. The one brand action color is Carbon Ink.

This record describes the incumbent calendar in `app/globals.css` and `components/vertical-calendar.tsx`. Future screens must stay inside this datebook. They must not become a week grid, a Google Calendar or Apple Calendar shell, a carded day list, or a colorful product UI.

**Key Characteristics:**

- Paper field with Carbon Ink as the only brand action color
- System SF-like type, tight tracking on titles, bold event names
- Continuous day list: month columns on desktop, stacked months on mobile
- Weekend days step inward; today is a filled ink disc
- Flat surfaces; lift only on floating actions and sheets
- Quiet hardware controls, not cards or chrome

## Colors

The palette is ink on paper. Chromatic color marks events and rare active states. It does not paint the product.

### Primary
- **Carbon Ink** (`{colors.carbon-ink}`): Text, today mark, primary floating actions, save, selected weekdays, and user voice bubbles. This is the product’s voice.
- **Gallery White** (`{colors.gallery-white}`): The page, sheets, and resting fields. The datebook stays paper-white, not warm cream and not app-gray.

### Secondary
- **Signal Indigo** (`{colors.signal-indigo}`): Rare. Active repeat control, voice-thinking orb, and the first event swatch. **Signal Indigo Deep** (`{colors.signal-indigo-deep}`) is the matching label ink.

### Neutral
- **Day Ink** (`{colors.ink-day}`): Day numbers at rest.
- **Muted Ink** (`{colors.ink-muted}`): Supporting field labels.
- **Time Ink** (`{colors.ink-time}`): Event times.
- **Meta Ink** (`{colors.ink-meta}`): Month years and other tabular metadata.
- **Paper Hover** (`{colors.paper-hover}`): Desktop day-row hover only. Mobile rows stay paper.
- **Paper Muted** (`{colors.paper-muted}`): Quiet fills.
- **Paper Chip** (`{colors.paper-chip}`): Close and back discs, agent bubbles.
- **Hairline** (`{colors.hairline}`): Field and sheet strokes. Nearby siblings `#dedede` and `#dcdcdc` are the same family.
- **Border** (`{colors.border}`): Root hairline.
- **Placeholder** (`{colors.placeholder}`): Title-field hint.

Event markup (not brand): `{colors.event-green}`, `{colors.event-red}`, `{colors.event-amber}`, `{colors.event-violet}`, `{colors.event-teal}`, plus Signal Indigo. These color the event title only.

### Named Rules
**The Carbon Voice Rule.** Carbon Ink is the only brand action color. Signal Indigo may appear on one control or one thinking state per surface. It may not become a header, a selected-day wash, or a product skin.

**The Event-Is-Not-Brand Rule.** Event swatches color titles. They do not fill rows, cards, or the page.

## Typography

**Display Font:** SF Pro Text / system UI (with Helvetica Neue, Arial)
**Body Font:** The same stack
**Label/Mono Font:** The same stack, with tabular numbers on dates and times

**Character:** One quiet system face. Hierarchy comes from size, weight, and tracking, not from a second family.

### Hierarchy
- **Display** (regular, 28px, tracking -0.035em): The event title field. The largest ink on a sheet.
- **Headline** (650, 25px / 24px on mobile, line-height 1, tracking -0.045em / -0.04em): Month names.
- **Title** (650, 20px, tracking -0.03em): Sheet titles.
- **Body** (700, 14px / 15px on mobile, 18px line): Event titles. Weight does the work. No background chip.
- **Label** (400, 12px–13px, tabular-nums): Times, years, and metadata.

### Named Rules
**The Type-Is-The-UI Rule.** If a fact can be type on paper, do not put it in a card, badge, or colored block. Event titles stay bold ink. Times stay small gray numerals.

## Layout

The spatial model is a continuous datebook, not a grid. Desktop reads as a horizontal strip of 280px month columns. Each column scrolls its own days. Mobile stacks months in one vertical scroll. The page is locked to `100dvh` so the list, not a browser chrome frame, is the app.

Density is tight and tabular. Day rows are 42px tall on desktop and 44px on mobile, with a 34px / 38px date column and a 7px gutter. Month columns pad 24px (22px on mobile) and leave 96px / 56px at the bottom for floating tools. Form rows use an 18px (14px on mobile) hardware gap. The one structural indent is the weekend step: Saturday and Sunday shift right by 24px.

The only breakpoint is 640px. Above it: horizontal months, sticky frosted month headings, day-row hover. Below it: a fixed frosted year + month header, hidden per-month headings, no row hover, and a slightly larger event title.

### Named Rules
**The Day-List Rule.** Time is a vertical list of days. Do not introduce week rows, hour gutters, or a calendar grid.

**The Weekend Step Rule.** Weekends indent 24px. That step is the only layout ornament on the list.

## Elevation & Depth

The datebook is flat at rest. Paper does not cast a shadow. Depth appears only when an object lifts off the page: circular floating actions and bottom sheets. Sticky month and mobile headers use frost (`rgba(255,255,255,.92–.94)` plus `blur(14px)`), not drop shadow.

### Shadow Vocabulary
- **Floating tool** (`box-shadow: 0 8px 28px rgba(0,0,0,.16)`): Primary and voice FABs.
- **Paper tool** (`box-shadow: 0 8px 28px rgba(0,0,0,.11), inset 0 0 0 1px rgba(0,0,0,.07)`): Secondary FAB. Lift plus a hairline inset so the white disc reads on paper.
- **Sheet** (`box-shadow: 0 -18px 70px rgba(0,0,0,.13)` event / `.16` voice): Bottom drawers only.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on floating actions and sheets.

## Shapes

The form language is quiet hardware. Pressed tools are circles. Fields are short lozenges with an 11px radius and a hairline. Confirm actions are 12px-radius ink capsules. Sheets use a 24px / 26px top radius so they read as a lifted page, not a modal card. Day rows may use a 9px radius on hover only. The today mark, weekday toggle, color swatch, and close disc are circles.

Hairlines are 1px `{colors.hairline}`. An active repeat control is the exception: a 2px Signal Indigo stroke. The title field has no capsule; it is a baseline rule only.

### Named Rules
**The Hardware Rule.** Circles for tools. Hairline lozenges for fields. Sheets for editors. No cards around days.

## Components

Controls feel like small, exact objects in a datebook. They are quiet until pressed.

### Buttons
- **Shape:** Confirm actions are gently rounded capsules (12px). Floating tools are 52px circles (50px on mobile).
- **Primary:** Carbon Ink fill, Gallery White label, 42px tall, 18px horizontal pad, weight 620. Disabled drops to 30% opacity.
- **Hover / Focus:** Floating tools rise 1px, then scale to 0.96 on press. Day rows scale to 0.985. Duration 0.12–0.14s ease. Sheet pages slide in 0.28s `cubic-bezier(.22,.8,.25,1)`.
- **Secondary:** White frost disc with inset hairline. Used only for “go to today.”

### Chips
- **Style:** Voice suggestions are white pills with a hairline and 13px type. Event titles are not chips.
- **State:** Weekday toggles are 32px circles; selected is Carbon Ink fill. Color swatches are 28px circles; selected gets a white inner ring and a 1.5px Carbon Ink outer ring.

### Cards / Containers
- **Corner Style:** None on the page. Sheets 24–26px on the top corners only.
- **Background:** Gallery White.
- **Shadow Strategy:** Sheet lift only. See Elevation.
- **Border:** Hairline on the sheet edge (`#dedede`).
- **Internal Padding:** 28px desktop / 20px mobile, plus safe-area.

### Inputs / Fields
- **Style:** 40px hairline lozenges for date, time, repeat, and interval. The event title is a 28px baseline field, not a box.
- **Focus:** No glow. The title keeps a 1px baseline. Repeat becomes a 2px Signal Indigo stroke when active.
- **Error / Disabled:** Save at 30% opacity when the title is empty. No error chrome is established.

### Navigation
- No app bar, sidebar, or tab bar. Orientation is the day list plus a mobile frosted year/month header. Floating tools sit at the bottom-right, 22px (18px mobile) from the corner, stacked with a 10px gap.

### Day list (signature)
A month is a column of days. Each day is a two-column row: tabular date, then a stack of event lines. Today’s number is a 26px Carbon Ink disc. Event lines are colored titles with optional 12px Time Ink. Hover underlines the title (2px offset). Clicking the row opens a new-event sheet; clicking the title edits.

## Do's and Don'ts

### Do:
- **Do** keep Gallery White paper and Carbon Ink as the brand action pair.
- **Do** let type carry the calendar: tight month headlines, bold event titles, tabular times.
- **Do** keep the weekend 24px indent and the today disc.
- **Do** lift only floating tools and sheets. Keep the list flat.
- **Do** treat controls as quiet hardware: circles, hairline lozenges, and a single ink confirm.

### Don't:
- **Don't** introduce a week grid, hour gutter, or Google Calendar / Apple Calendar chrome.
- **Don't** wrap days in cards or paint rows with event color.
- **Don't** turn Signal Indigo or event swatches into a product skin.
- **Don't** add a second type family or decorative display face.
- **Don't** add shadows to resting paper, rows, or headers.
