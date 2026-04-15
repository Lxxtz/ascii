```markdown
# Design System Strategy: Institutional Thermal Precision

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Tactical Command Center."** 

Moving away from the high-energy "Kinetic" origins, this evolution embraces a high-precision, institutional finance aesthetic. It is designed to feel like a sophisticated thermal imaging interface—quiet and dark by default, but intensely communicative when risk thresholds are crossed. We break the "template" look by rejecting standard borders and grids in favor of **Tonal Topography**. The interface is not a set of boxes; it is a landscape of data where importance is signaled through luminance and "heat."

### Design Principles
*   **Institutional Authority:** Heavy use of `#0e0e0e` (Obsidian) to create a void-like depth that feels permanent and secure.
*   **Thermal Signaling:** Color is used as information, not decoration. The shift from "Obsidian" to "Warning Red" creates a psychological sense of urgency.
*   **Intentional Asymmetry:** Data density is balanced by strategic "dead zones" (large negative space) to focus the eye on high-priority alerts.

---

## 2. Colors: The Thermal Palette

This system utilizes a "Dark Logic" approach. Instead of highlighting everything, we bury the mundane and illuminate the critical.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through background color shifts. 
*   Use `surface-container-low` (#131313) to define a secondary work area against the `surface` (#0e0e0e) background.
*   The eye should perceive a change in "depth" rather than a "fence."

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
*   **Base:** `surface` (#0e0e0e)
*   **Raised Sections:** `surface-container` (#191a1a)
*   **Interactive Elements:** `surface-container-high` (#1f2020)
*   **Floating/Active States:** `surface-bright` (#2c2c2c)

### The "Glass & Gradient" Rule
To avoid a flat, "web-app" feel, use **Glassmorphism** for floating overlays. Apply `surface-container-highest` (#252626) at 70% opacity with a `24px` backdrop blur. This allows "thermal" data (like red heat signatures) to bleed through the glass, maintaining spatial awareness.

### Signature Textures
Main CTAs should not be flat. Apply a subtle linear gradient from `primary` (#ffb3ad) to `primary_container` (#930013) at a 45-degree angle. This creates a "smoldering" effect that feels high-end and tactile.

---

## 3. Typography: Inter High-Precision

We use **Inter** as a tool for legibility and institutional coldness.

*   **Display (lg/md/sm):** Used for massive, singular data points (e.g., Total Portfolio Value). Use `on_surface` (#e7e5e4) with `-0.02em` letter spacing to feel "engineered."
*   **Headline & Title:** Used for section headers. Always use `surface_variant` (#252626) for non-active headers to keep them recessed, switching to `on_surface` only when the section is active.
*   **Body (lg/md/sm):** The workhorse. Maintain high contrast with `on_surface` for readability.
*   **Label (md/sm):** These are the "micro-data" markers. Use `outline` (#767575) for units (e.g., "USD" or "BPS") to ensure they provide context without distracting from the primary figures.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are too "soft" for this system. We use **Luminance Steps.**

*   **The Layering Principle:** To lift a card, do not add a shadow. Move it from `surface_container_low` to `surface_container_high`.
*   **Ambient Shadows:** If an element must float (like a context menu), use a shadow with a `40px` blur, color `#000000` at 60% opacity. It should feel like a silhouette, not a glow.
*   **The "Ghost Border" Fallback:** In extreme cases where contrast is required for accessibility, use a "Ghost Border": `outline_variant` (#484848) at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Style Guide

### Buttons
*   **Primary (Urgent/Risk):** Background: `primary` (#ffb3ad) | Text: `on_primary` (#860011). Use for "Execute," "Sell," or "Liquidate."
*   **Secondary (Stable):** Background: `secondary_container` (#00460e) | Text: `on_secondary_container` (#38db4f). Use for "Save," "Approve," or "Safe Entry."
*   **Tertiary:** Ghost style. No background, `on_surface_variant` text.

### Input Fields
*   **Default:** `surface_container_highest` background, no border. `label-sm` floating above the field.
*   **Critical/Error:** A `2px` bottom-bar of `error` (#ee7d77). The background should shift to a subtle 5% tint of `error_container` (#7f2927).

### Cards & Lists
*   **Strict Rule:** No dividers. Use `16px` or `24px` of vertical space to separate list items. 
*   **Thermal Heatmaps:** Use `tertiary_container` (#fdd404) for mid-level warnings and `primary` (#ffb3ad) for high-intensity risk alerts within data cells.

### Custom Component: The "Alert Pulse"
For high-intensity financial alerts, use a small 8px circle of `error` (#ee7d77) with a repeating scale animation and a `surface_tint` blur to simulate a blinking "Warning Red" signal.

---

## 6. Do's and Don'ts

### Do
*   **DO** use `surface_container_lowest` (#000000) for deep-set backgrounds to maximize contrast for the Inter typeface.
*   **DO** use "Warning Red" (`primary` tokens) sparingly. If everything is red, nothing is urgent.
*   **DO** lean into the asymmetry. Align heavy data to the left and leave the right side of the container open for "breathing room."

### Don't
*   **DON'T** use the Electric Lime Green (`secondary`) for anything other than a confirmed "Success" or "Stable" state. It is the "All Clear" signal.
*   **DON'T** use 100% white. Use `on_surface` (#e7e5e4) to prevent eye strain against the obsidian background.
*   **DON'T** round corners excessively. Stick to `sm` (2px) or `none` (0px) for a more "brutalist" institutional feel. Only use `full` for status chips.