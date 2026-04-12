# Design Notes

## Palette logic
- `#F6F3EC` anchors the app background so the product feels warm and editorial rather than clinical white or dark-mode heavy.
- `#FFFDF8` and `#ECE6DA` create a clearer split between primary surfaces and secondary support panels, which reduces the earlier beige-on-beige sameness.
- `#22312D` and `#51625C` keep body copy calm while maintaining accessible contrast.
- `#2F6A58` is reserved for committed actions, active states, and progress so the interface has one clear source of emphasis.
- `#8A6B3D`, `#6E5E86`, and `#8E5B52` are used sparingly for caution, rare accent, and serious safety states without turning the UI into alert-heavy noise.

## Hierarchy decisions
- Headings now use a restrained serif stack to introduce a more editorial, adult tone while body copy stays in a highly readable sans-serif.
- Each main page uses the same header pattern: section label, title, short state line, and compact meta area.
- Cards, helper callouts, chips, and section blocks now have more distinct backgrounds and borders so users can parse the page in layers instead of reading long uninterrupted slabs.
- Progress and completeness are shown as explicit labels plus a single rail, not as flashy gamified widgets.

## Layout decisions
- The sidebar width was reduced to `272px` to return more space to the primary content column.
- Active navigation uses stronger border and surface contrast so the current location reads immediately.
- Content width is constrained to keep line length readable and reduce cognitive drift on text-heavy screens.
- Match cards were rebuilt around three layers: summary, rationale, and action.
- Chat now separates thread selection, profile context, message history, and composer so the main task area stays stable.

## Neuroinclusive UX decisions
- Onboarding is chunked into short sections with a visible progress map and a single obvious primary action.
- Profile editing groups related decisions together so users do not need to continuously re-interpret the form.
- Matches prioritize summary first, explanation second, and next action third.
- Safety language stays direct and platform-focused rather than alarming or vaguely therapeutic.
- Motion was kept minimal; emphasis comes from spacing, borders, and typography rather than animation.

## Component and system decisions
- Reusable surface patterns now cover page headers, panels, feature cards, section cards, key-value blocks, status pills, and action rows.
- Buttons use a clear hierarchy: primary for commitment, secondary for lower-pressure supporting actions, ghost for neutral controls, and danger only for safety actions.
- Focus states are visible across buttons, inputs, selects, textareas, and list items.
- The production build now assumes browser routes belong to the app and API routes belong under `/api`, which keeps deployment behavior predictable.
