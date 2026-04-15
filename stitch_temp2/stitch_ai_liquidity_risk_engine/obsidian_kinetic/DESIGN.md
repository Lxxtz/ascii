# Design System: Institutional Precision

## 1. Overview & Creative North Star: "The Kinetic Engine"
The Creative North Star for this design system is **The Kinetic Engine**. This is not a friendly consumer app; it is a high-performance, engineered tool. It draws inspiration from aerospace telemetry, tactical HUDs, and brutalist editorial layouts. 

To break the "standard template" feel, we prioritize **intentional asymmetry** and **high-density information**. The layout should feel like a living machine—where primary actions pierce through a void of obsidian darkness with surgical precision. We favor "The Overlap"—allowing semi-transparent glass layers to stack atop heat-signature glows, creating a sense of infinite z-axis depth without ever using a traditional drop shadow.

---

## 2. Colors: The High-Contrast Void
The palette is rooted in `surface_container_lowest` (#000000) and `background` (#070d1f). This isn't just "dark mode"; it is a digital abyss designed to make the `primary` Electric Lime and `tertiary` Amber Glow vibrate with importance.

### The "No-Line" Rule
**Borders are a failure of hierarchy.** Explicitly prohibit 1px solid borders for sectioning. Structural boundaries must be defined solely through:
- **Tonal Shifts:** Placing a `surface_container_high` module against the `background`.
- **Negative Space:** Using the Spacing Scale to create "channels" of obsidian that separate functional groups.
- **Glass Edge:** A 1px translucent highlight on the *top* edge only to simulate light catching an engineered bezel.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
- **The Void:** `surface_dim` (#070d1f) is your canvas.
- **The Plates:** `surface_container` (#11192e) for secondary modules.
- **The Precision Inserts:** `surface_container_highest` (#1c253e) for active or focused content areas.
- **The Glass:** Use `surface_variant` at 40% opacity with a `24px` backdrop blur for floating cards.

### Signature Textures
To add "soul," use **Heat-Signature Glows**. Place large, soft radial gradients of `inverse_on_surface` (#4f5469) and deep charcoal behind key data points. These should be felt, not seen—providing a subtle "warmth" to the cold, tech-heavy environment.

---

## 3. Typography: Sharp & Precise
We utilize **Inter** exclusively. It is the typeface of the modern institution—neutral, legible, and engineered.

- **Display (display-lg/md):** Used for "Big Data" metrics. Tracking should be set to `-0.02em` to feel tighter and more industrial.
- **Headlines (headline-sm):** Always Uppercase when used for section titles to convey authority.
- **Labels (label-md/sm):** The workhorse of the system. Use `on_surface_variant` (#a5aac2) for meta-data to ensure the `primary` content stands out.
- **Hierarchy:** Contrast is achieved through weight and color (e.g., `primary` lime for critical numbers vs. `outline` for units).

---

## 4. Elevation & Depth: Tonal Layering
Traditional material shadows are forbidden. They are too "organic" for an institutional tool.

- **The Layering Principle:** Depth is achieved by "stacking" the surface tiers. A `surface_container_low` card sits on a `surface` background to create a soft, natural lift.
- **Ambient Glows:** Instead of shadows, use "Outer Glows" for active states. A `4px` blur of `primary` at 20% opacity creates a "powered-on" effect for buttons.
- **The "Ghost Border" Fallback:** If a containment line is required for accessibility, use `outline_variant` (#41475b) at **15% opacity**. It should be barely perceptible.
- **Glassmorphism:** All modal overlays must use a `20px` backdrop blur. This prevents the "pasted-on" look and ensures the UI feels like a single integrated instrument.

---

## 5. Components

### Buttons: The Power Switches
- **Primary:** Background `primary` (#b4e85b), Text `on_primary` (#385300). No curves (4px radius). High-gloss finish.
- **Secondary:** Transparent background, `primary` 15% opacity Ghost Border, Text `primary`.
- **Tertiary:** No background, Text `on_surface_variant`. Underline only on hover.

### Input Fields: Precision Data Entry
- **State:** Never use a full box. Use a "Bottom-Tray" approach—a 2px baseline of `outline` that turns `primary` on focus.
- **Micro-copy:** Helper text must use `label-sm` in `on_surface_variant`.

### Cards & Modules: The Glass Plates
- **Forbid Dividers:** Use vertical white space or a subtle shift from `surface_container_low` to `surface_container_highest`.
- **Interactive States:** On hover, the glass opacity should increase by 10%, and the "Heat-Signature Glow" behind the card should intensify.

### Data Visualization (Signature Component)
- **Safe Zones:** Use `secondary` (Deep Emerald) for positive growth or stable systems.
- **Warning Zones:** Use `tertiary` (Amber Glow) for thresholds.
- **The Grid:** Use a background dot-matrix grid (12px spacing) in `outline_variant` at 5% opacity to reinforce the "engineered" aesthetic.

---

## 6. Do's and Don'ts

### Do
- **Do** embrace the 4px radius; it communicates precision and engineering.
- **Do** use high-contrast "Inter" scales (e.g., a 10pt label next to a 48pt display value).
- **Do** use "Electric Lime" sparingly; it is a laser pointer, not a paint bucket.
- **Do** allow content to overlap background "Heat-Signature" glows.

### Don't
- **Don't** use 1px solid borders to separate content; it creates "visual noise."
- **Don't** use Navy. Depth is achieved through Indigo-Charcoal tones, not traditional blue.
- **Don't** use standard drop shadows; they feel like "web design" rather than "interface engineering."
- **Don't** use rounded corners above 4px. Anything softer loses the institutional edge.