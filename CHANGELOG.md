# Changelog

## Visual system
- Replaced the softer beige-heavy UI treatment with a sharper, quieter design system built around the requested palette.
- Reduced sidebar width and improved nav active states, spacing rhythm, borders, and heading scale.
- Introduced clearer surface differentiation for primary content, support panels, helper callouts, and safety states.

## UX improvements
- Reworked page headers into a consistent pattern with title, state line, and compact metadata.
- Improved onboarding scanability with stronger progress framing and a step map.
- Reorganized profile editing into logical sections and made interpreted summary distinct from structured facts.
- Rebuilt match cards around summary, rationale, and action layers.
- Improved chat hierarchy by separating profile context, thread content, and composer.
- Made safety/reporting feel more serious and structured without alarm-heavy styling.

## Accessibility
- Strengthened visible focus states across interactive elements.
- Improved content chunking, line length, and section spacing for lower cognitive load.
- Reduced reliance on color alone by pairing state color with labels, titles, and structural grouping.

## Deployment and runtime
- Added a single-port production start path for Replit by serving the built web app from Fastify.
- Moved API traffic under `/api` so browser routes like `/matches` work correctly in production.
- Added `start` scripts, `PORT` support, `SERVE_WEB` support, and updated env defaults to reflect the new route boundary.
- Re-verified typecheck, build, quality, local dev commands, and production start behavior.
