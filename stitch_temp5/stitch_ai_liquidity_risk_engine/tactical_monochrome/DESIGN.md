```markdown
# Design System Specification: Tactical Engineering Aesthetic

## 1. Overview & Creative North Star
**The Creative North Star: The Sovereign Instrument**

This design system is not a dashboard; it is a high-precision instrument. It rejects the "software-as-a-service" aesthetic in favor of a "hardware-as-a-service" philosophy. It is designed for the high-stakes environment of a bank risk engine, where clarity is a form of risk mitigation. 

The system moves beyond standard UI by embracing **Tactical Brutalism**. We replace soft, rounded consumer tropes with ultra-sharp 90-degree geometry, high-density data layouts, and a strictly functionalist color theory. The visual identity breaks the "template" look through intentional asymmetry—utilizing heavy-weighted data columns against expansive, quiet voids of matte charcoal. It is an aesthetic of absolute certainty and technical authority.

---

## 2. Colors & Tonal Logic
The palette is a study in restrained power. It uses a grayscale foundation to provide a "dark mode" that feels like anodized aluminum rather than generic plastic.

### The Grayscale Foundation
*   **Surface (Background):** `#131313` — The "Matte Charcoal" base. All work begins here.
*   **Primary:** `#ffffff` — Reserved for critical text and high-level UI triggers.
*   **Surface Containers:** Use `surface_container_lowest` (#0e0e0e) for recessed areas and `surface_container_highest` (#353534) for elevated tactical panels.

### The Thermal Accents
Accents are never decorative. They are functional indicators of heat (risk).
*   **Secondary (Electric Red):** `#ffb4aa` / `#930005` — Used exclusively for critical breaches and immediate risk failures.
*   **Tertiary (Safety Orange):** `#ffdcbf` / `#d47b00` — Used for warnings, trend volatility, and "warming" risk metrics.

### The "No-Line" Rule
Prohibit the use of 1px solid borders for sectioning. Boundaries must be defined through **Background Shift Logic**. To separate a sidebar from a main stage, shift from `surface` to `surface_container_low`. The eye should perceive depth through value changes, not "drawn" boxes.

### Signature Textures
Avoid generic CSS gradients. Instead, use **Dithered Heat-Maps**. When visualizing risk intensity, use a noise-textured transition between `surface_container_highest` and `secondary_container` to create a "thermal camera" effect that feels engineered rather than rendered.

---

## 3. Typography
We use **Inter** as a variable font, leveraging its mathematical precision and high legibility at small scales.

*   **Display (Large Scale):** Used for "At-A-Glance" risk scores. Set with tight tracking (-0.02em) to feel like stamped serial numbers.
*   **Headline & Title:** Used for sector identification. These should be treated as "labels" for the data below them—authoritative and static.
*   **Body & Labels:** This system thrives on `body-sm` and `label-sm`. In a high-density engineering tool, we favor information density over "white space." Precision is achieved through perfect alignment, not large font sizes.

The hierarchy conveys **Systematic Order**: If a piece of data is fluctuating, it uses a monospace-adjacent Inter variant to ensure numerical alignment in tables (Tabular Lined figures).

---

## 4. Elevation & Depth
In this system, depth is not "height"; it is **Layering**.

*   **The Layering Principle:** Stacking is the primary tool for hierarchy. A `surface_container_highest` module represents a "plug-in" component sitting atop the base engine. 
*   **The "Ghost Border" Fallback:** If a container must be defined against an identical background, use a Ghost Border: `outline_variant` (#474747) at 15% opacity. It should be felt, not seen.
*   **Shadows:** Shadows are almost entirely forbidden. If an overlay (like a modal) is required, use an "Ambient Void": a massive 64px blur at 4% opacity using the `surface_container_lowest` color.
*   **Zero-Radius Mandate:** Every corner in this system is `0px`. Roundness suggests "friendly" and "approachable." We are building "formidable" and "accurate."

---

## 5. Components

### Buttons
*   **Primary:** Solid `primary` (#ffffff) with `on_primary` (#1a1c1c) text. Sharp corners. No shadow.
*   **Secondary:** Ghost-style. `outline` (#919191) at 20% opacity with white text.
*   **States:** Hover states should not "glow." They should "invert." A primary button hover should shift to a `secondary_fixed` (#ffb4aa) tint if risk-related, or simply a subtle tonal shift in grayscale.

### Data Inputs
*   **Fields:** Use `surface_container_lowest` for the input well. No bottom line. A 2px `primary` left-side accent bar appears only when the field is focused.
*   **Validation:** Error states use the "Thermal" logic. An invalid entry doesn't just show red text; the entire input well takes on a `secondary_container` (#930005) subtle dithered fill.

### Cards & Modules
*   **The "No-Divider" Rule:** Never use a horizontal rule `<hr>` to separate list items. Use 8px of vertical space or a toggle between `surface_container_low` and `surface_container_medium`.
*   **Thermal Cells:** In data tables, cells should change background color based on value intensity (e.g., a "Risk Score" cell uses a background scale from `surface_container` to `secondary_container`).

### Tactical Overlays (Tooltips)
*   **Style:** Dark-on-dark. `surface_container_highest` background with `on_surface` text. Use a 1px `outline_variant` border at 50% opacity to ensure it cuts through the background data.

---

## 6. Do’s and Don’ts

### Do
*   **Do** prioritize information density. A user should be able to see 50+ data points without scrolling.
*   **Do** use "Optical Alignment." Because we use 0px borders, ensure text is perfectly inset by 12px or 16px from container edges.
*   **Do** use `secondary` (Red) and `tertiary` (Orange) *only* for data-driven alerts. If a button is not a "Delete" or "Emergency Stop" button, it should never be red.

### Don’t
*   **Don’t** use shadows to create depth. Use tonal shifts between the `surface_container` tiers.
*   **Don’t** use "Soft" language. Use technical labels (e.g., instead of "User Settings," use "System Configuration").
*   **Don’t** use rounded corners for any reason. Even selection chips and checkboxes must be perfect squares.
*   **Don’t** use generic blue for links. Navigation is either `primary` (white) or `outline` (grey) depending on its importance in the engine's hierarchy.```