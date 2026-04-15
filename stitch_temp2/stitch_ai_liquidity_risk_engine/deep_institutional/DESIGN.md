# Design System Strategy: Deep Institutional

## 1. Overview & Creative North Star: "The Sovereign Analyst"
The Creative North Star for this design system is **"The Sovereign Analyst."** Unlike consumer fintech which focuses on approachability, this system is built for the high-stakes environment of institutional risk management. It prioritizes authority, cognitive clarity, and a sense of "quiet power."

We break the "template" look by rejecting the standard white-background grid. Instead, we utilize a dark, multi-layered "Command Center" aesthetic. We move away from rigid, boxed-in layouts toward a fluid, editorial experience where data breathes. By using intentional asymmetry—such as oversized display metrics contrasted against hyper-dense data grids—we create a visual rhythm that guides a Risk Officer’s eye to what matters most without sensory overload.

## 2. Colors: Tonal Depth & Functional Light
The palette is rooted in the dark spectrum to reduce eye strain during long-form analysis, using vibrant functional accents as "signal flares" within the noise.

*   **Primary (#a4d64c - Cyber Lime):** Reserved for growth, stability, and "System Go" states. It is the pulse of the engine.
*   **Secondary (#ffb95f - Alert Amber):** Used for caution, moderate volatility, and elements requiring heightened monitoring.
*   **Tertiary (#ffb3ad - Crimson/Stress):** High-signal color for breach of limits, liquidity failures, or critical system errors.

### The "No-Line" Rule
Standard 1px borders are prohibited for sectioning. They clutter the UI and create visual "friction." Boundaries must be defined exclusively through:
1.  **Background Shifts:** Place a `surface_container_high` element against a `surface` background to define a zone.
2.  **Negative Space:** Use the spacing scale to create groupings.
3.  **Subtle Tonal Transitions:** A shift from `surface_container_low` to `surface_container_lowest` creates a natural inset feel without a single line being drawn.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-translucent materials. 
*   **The Base:** `surface` (#0b1326) is the "floor."
*   **The Inset:** Use `surface_container_lowest` for recessed areas like data entry troughs.
*   **The Lift:** Use `surface_container_highest` for primary action cards or active monitoring widgets.

### The "Glass & Gradient" Rule
To achieve a high-end feel, main navigation rails and floating "Quick Action" menus should use **Glassmorphism**. Apply `surface_variant` at 60% opacity with a `20px` backdrop blur. For primary CTAs, use a subtle linear gradient from `primary` to `on_primary_container` (135° angle) to give the button a "jeweled" institutional quality.

## 3. Typography: Precision Editorial
We use **Inter** for its neutral, mathematical precision. The goal is to make dense financial data feel like a high-end financial broadsheet.

*   **Display (Large/Medium):** Used for top-level LCR/NSFR percentages. These should be tracked-in slightly (-0.02em) to feel "heavy" and authoritative.
*   **Headline & Title:** Used for risk category headers. Use `on_surface_variant` to keep these secondary to the actual data values.
*   **Body (Small/Medium):** The workhorse for data grids. Ensure a line-height of 1.5 for prose, but tighten to 1.2 for tabular data to maximize "at-a-glance" density.
*   **Labels:** Always uppercase with +0.05em letter spacing when used for metadata (e.g., "BASEL III COMPLIANT").

## 4. Elevation & Depth: Tonal Layering
In this system, "Higher" does not mean "Brighter Shadows"; it means "Closer to the Light Source."

*   **The Layering Principle:** Stack `surface_container` tiers to create hierarchy. A `surface_container_highest` card sitting on a `surface_container_low` dashboard creates an immediate, sophisticated lift.
*   **Ambient Shadows:** For floating modals, use a "Shadow-Glow." Instead of black, use `surface_container_lowest` at 40% opacity with a 48px blur. This makes the element feel like it's hovering in a deep space rather than casting a dirty shadow.
*   **The "Ghost Border" Fallback:** When separation is legally or functionally required (e.g., in a complex grid), use `outline_variant` at 15% opacity. It should be felt, not seen.
*   **Glassmorphism Depth:** Elements using backdrop blurs should have a 0.5px "Light Leak" on the top and left edges using `outline` at 20% opacity to mimic the edge of a glass pane.

## 5. Components: Institutional Primitives

*   **Glass Cards:** No borders. Background: `surface_container_high` at 70% opacity. Backdrop-blur: 16px. Border-radius: `xl` (0.75rem).
*   **Data Grids:** Forbid divider lines. Alternate rows between `surface` and `surface_container_low`. Text should be `on_surface` for values and `on_surface_variant` for headers.
*   **Circular Gauges (LCR/NSFR):** Use a thick stroke (12px) for the track (`surface_variant`) and a glowing stroke for the value (`primary`). Use a subtle outer glow (blur 8px) of the same color to indicate the "live" nature of the data.
*   **Buttons:**
    *   *Primary:* `primary` background with `on_primary` text. No shadow; use a subtle inner glow.
    *   *Secondary:* `surface_container_highest` background with a `ghost border`.
*   **Inputs:** Recessed look. Background: `surface_container_lowest`. On focus, the border doesn't change color; instead, the background shifts to `surface_container_low` and a `primary` 1px bottom-bar appears.
*   **Precise Line Graphs:** Use 2px paths. Areas under the curve should have a fading gradient of the path color (e.g., `primary` to transparent at 10% opacity) to provide volume without obscuring grid lines.

## 6. Do's and Don'ts

### Do:
*   **Do** use extreme typographic scale. Make the "Risk Score" huge and the "Last Updated" tiny.
*   **Do** embrace the dark. Ensure 90% of the UI remains in the `surface` to `surface_container_high` range.
*   **Do** use Cyber Lime (#BEF264) sparingly. It is a "Signal," not a decoration.

### Don't:
*   **Don't** use pure black (#000000). It kills the "Deep Institutional" navy depth.
*   **Don't** use 1px solid borders to separate sections or grid rows.
*   **Don't** use standard "drop shadows" on cards. Stick to tonal shifts and glass blurs.
*   **Don't** round corners excessively. Use `md` (0.375rem) for functional elements and `xl` (0.75rem) for major containers to maintain a serious, "engineered" feel.