# Design System Strategy: Atmospheric Precision

## 1. Overview & Creative North Star
The objective of this design system is to transcend the "institutional" stereotype. We are moving away from cold, clinical grids and toward **"Atmospheric Precision."** 

This system is a digital expression of calm authority. It interprets the request for a soothing, low-strain environment not through dullness, but through tonal depth and editorial intent. We break the "standard template" look by utilizing intentional asymmetry, generous whitespace, and a "layered paper" philosophy. The interface should feel like a high-end architectural portfolio—structured, quiet, and impeccably organized.

## 2. Color Philosophy: The Tonal Landscape
The palette is rooted in desaturated slates and driftwood greys, designed to recede into the background, allowing the user’s content to remain the primary focus.

### The "No-Line" Rule
**Explicit Instruction:** You are prohibited from using 1px solid borders to define sections, headers, or sidebars. 
Traditional borders create visual "noise" that contributes to eye strain. Instead, boundaries must be defined solely through background color shifts. Use the `surface` tokens to create separation:
*   **The Canvas:** Use `background` (#f6fafe) for the primary viewport.
*   **The Section:** Use `surface-container-low` (#eef4fa) to define large functional areas.
*   **The Inset:** Use `surface-container-high` (#ddeaf3) for interactive or nested zones.

### Surface Hierarchy & Nesting
Think of the UI as a physical desk. The `surface-container-lowest` (#ffffff) represents a fresh sheet of paper placed on top of a `surface-container` (#e5eff7) desk. 
*   **Nesting:** When placing a card inside a sidebar, do not reach for a border. Shift the card color to `surface-container-lowest` if the sidebar is `surface-container-low`. The 2% shift in luminance is enough for the human eye to perceive a boundary without the "trapped" feeling of a stroke.

### The Glass & Gradient Rule
To prevent the UI from feeling "flat" or "cheap," use **Glassmorphism** for floating elements (modals, dropdowns, or sticky headers). 
*   **Implementation:** Use `surface-variant` (#d5e5ef) at 70% opacity with a `20px` backdrop-blur. 
*   **Signature Gradients:** For primary CTAs, do not use a flat hex. Apply a subtle linear gradient from `primary` (#515f74) to `primary-dim` (#455367) at a 135-degree angle. This adds a "weighted" feel to the button, suggesting tactile quality.

## 3. Typography: The Editorial Voice
We use **Manrope** exclusively. It is a modern, geometric sans-serif that maintains a professional, institutional weight while remaining approachable.

*   **Display & Headlines:** Use `display-lg` (3.5rem) and `headline-md` (1.75rem) to create dramatic hierarchy. These should be set with a slightly tighter letter-spacing (-0.02em) to feel "locked in" and authoritative.
*   **The Scale:** 
    *   **Body Text:** Use `body-md` (0.875rem) for standard reading. It provides a sophisticated density compared to the common 1rem default.
    *   **Labels:** Use `label-md` (0.75rem) with `on-surface-variant` (#52616a). Apply a +0.05em letter-spacing to labels to ensure legibility at small sizes.
*   **Hierarchy Tip:** Instead of using bold weights for everything, use color. A `title-md` in `on-surface` (#26343d) will naturally stand out against `body-md` in `on-surface-variant` (#52616a).

## 4. Elevation & Depth: Tonal Layering
In this design system, depth is a result of light and layering, not "drop shadows."

*   **The Layering Principle:** Stacking tiers is the primary method of elevation. A `surface-container-lowest` card sitting on a `surface-container-low` section creates a "lift" through contrast.
*   **Ambient Shadows:** If an element must float (like a FAB or a Tooltip), use a shadow tinted with the `on-surface` color (#26343d) at 5% opacity. Increase the blur to 24px or higher. This mimics natural, ambient light diffusion rather than a digital "drop shadow."
*   **The "Ghost Border" Fallback:** If accessibility requirements demand a container boundary, use a **Ghost Border**. Apply `outline-variant` (#a4b4be) at 15% opacity. It should be barely perceptible—a suggestion of a line, not a hard stop.

## 5. Components: Refined Interaction

### Buttons (The Precision Tool)
*   **Primary:** Gradient of `primary` to `primary-dim`. Roundedness: `md` (0.375rem). No border.
*   **Secondary:** Fill of `secondary-container` (#d4e4fa) with text in `on-secondary-container` (#445365). This is for high-frequency actions that shouldn't shout.
*   **Tertiary:** No background. Use `primary` (#515f74) for text. On hover, apply a `surface-container-highest` (#d5e5ef) background with a 400ms transition.

### Input Fields (The Quiet Entry)
*   **Style:** No bottom-line or 4-sided border. Use a solid fill of `surface-container-highest` (#d5e5ef). 
*   **Focus State:** Shift the background to `surface-container-lowest` (#ffffff) and apply a 1px "Ghost Border" using the `primary` (#515f74) token at 30% opacity.

### Cards & Lists (The Editorial Layout)
*   **Forbid Dividers:** Do not use horizontal lines to separate list items. Use vertical padding (16px - 24px) from the spacing scale and subtle background shifts.
*   **Layout:** Use asymmetrical padding (e.g., more padding on the left than the right) for title cards to create a modern, editorial rhythm.

### Thermal Status Indicators
Maintain the "Thermal" logic but use the muted, sophisticated versions provided:
*   **Error/Alert:** Use `error_container` (#fe8983) for the background and `on_error_container` (#752121) for text. It’s a "pastel brick" tone that warns without screaming.

## 6. Do’s and Don’ts

### Do
*   **Do** use `surface-container` tiers to create hierarchy.
*   **Do** prioritize whitespace. If a layout feels cluttered, increase the padding, don't add a border.
*   **Do** use `Manrope` in sentence case for a friendlier, institutional feel.
*   **Do** leverage `surface_bright` for areas that need to feel "active" or "illuminated."

### Don't
*   **Don't** use 100% black (#000000) or pure white (#FFFFFF) for text. Use the `on-surface` (#26343d) tokens for a softer, premium contrast.
*   **Don't** use harsh, high-saturation reds or greens for status. Stick to the "muted thermal" palette.
*   **Don't** use `DEFAULT` roundedness for large containers; use `xl` (0.75rem) for cards and `md` (0.375rem) for small components like buttons.
*   **Don't** use shadows on every card. Only shadow elements that are "physically" floating above the content.