# Still — design system

## Philosophy

Still is a private-feeling gallery for remembering films watched and books read. Artwork carries the colour; the interface stays warm, quiet, and easy to scan. Personal notes are treated as the user's own words, never as ratings or review scores. The interface should feel considered without making a small collection feel like work.

## Colour

| Token  | Value     | Use                        |
| ------ | --------- | -------------------------- |
| Paper  | `#f7f6f2` | Main canvas and surfaces   |
| Ink    | `#272925` | Primary text               |
| Muted  | `#777a72` | Supporting text            |
| Line   | `#e5e3dc` | Dividers and quiet borders |
| Garden | `#344b3d` | Primary action and mark    |
| Clay   | `#c87c5d` | Tiny moments of emphasis   |

Use the garden green for primary actions, not large decorative fills. Keep text contrast readable; supporting copy should remain legible against paper. Posters and covers supply most colour.

## Typography

Use the platform system sans-serif for interface text and Georgia for large editorial titles, item titles, and personal notes. This keeps the app quick, private, and readable without a font download. Keep interface labels small and letter-spaced only when they act as quiet section markers. Use size, spacing, and alignment before adding weight.

## Spacing and shape

Use a 4px base rhythm. Common gaps are 8, 12, 16, 24, 32, and 48px. Gallery pages use generous outer margins and a 1240px content maximum. Cards use a restrained 4px radius; sheets and dialogs use 8–14px. Borders are preferred over shadows. Shadows belong only to overlays and hover states.

## Layout and artwork

The collection is the home screen. Keep filters and collection search visually secondary. Use five columns on wide desktop, four on tablets, and two on mobile. Preserve film-poster proportions; books may use contained covers with the warm surface visible around them. Images must have useful alt text and lazy-load in the gallery. Missing artwork uses a quiet typographic placeholder rather than a broken-image symbol.

## Components

- **Collection card:** Artwork first; title and one restrained line below.
- **Add flow:** Choose film or book, search the matching metadata provider, or enter details and an artwork URL by hand if search is unavailable.
- **Detail sheet:** Large title and artwork; date/context; notes; compact structured metadata.
- **Primary button:** Garden green pill with clear text and a generous touch target.
- **Search field:** Quiet outline or underline, with a visible focus treatment.
- **Empty state:** Calm invitation and one clear action.

## Responsive behaviour

Start from a two-column phone gallery. At tablet widths use four columns and at large desktop use five or six. Limit reading width instead of stretching content. Detail and add surfaces become bottom sheets on phones and right-side panel/centred dialog on larger screens. Respect safe-area insets and keep actions reachable above the home indicator.

## Interaction and accessibility

Cards and actions work by keyboard and touch. Every icon-only button has an accessible name; fields have visible labels; focus states remain visible. Hover adds a small lift but never reveals required information. Use semantic buttons and dialogs, meaningful image alternatives, readable contrast, and `prefers-reduced-motion`. Keep transitions short and quiet.
