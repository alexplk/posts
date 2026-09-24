# Task: apply company corner radii + switch the home search to `SearchBox`

You're updating the portal home page, a React + TypeScript page in `home/`. File, component, class and prop names may have drifted from what's listed here. Find each element **by its description on the page**, and treat the "likely in" hints as a starting point only.

Rules: no inline styles; keep each change in the component's own `*.module.css`; change only what's listed.

## Radius tokens

- **radius-default = 4px**: containers, panels, cards, inputs, regular buttons
- **radius-mini = 2px**: small inline elements (tags, chips, badges, buttons inside an input)

Write the literal value with the token name in a comment:

```css
border-radius: 4px; /* radius-default */
border-radius: 2px; /* radius-mini */
```

## Radius changes

| # | Element on the page | Likely in | Was | Now |
|---|---|---|---|---|
| 1 | **Hero photo band** (wide photo with "The keys to unlock AI & Data at UBS"), only when it's contained in the 1440px column on very wide screens | `HeroBanner.module.css`, `.inset` / contained rule in `@container (min-width: 1800px)` | 22px | radius-default, **4px** |
| 2 | **Search panel**: the white card overlapping the bottom of the hero band, holding the search input and suggestions | `SearchPanel.module.css` `.panel` | 16px | radius-default, **4px** |
| 3 | **Suggestion chips** under the search input ("What is Claves and what can I do with it?", …) | `SuggestionChip.module.css` `.chip` | 999px (pill) | radius-mini, **2px** |
| 4 | **"For you" cards**: dark maroon Claves Navigator card, white Claves Microsite card, white Claves in M365 Copilot card | `PromoLinkTile.module.css` `.tile` | 14px | radius-default, **4px** |
| 5 | **"Open Navigator" button** on the dark Navigator card, plus the shared base for all action buttons | `ActionButton.module.css` `.button` | 8px | radius-default, **4px** |
| 6 | **"Visit the microsite ↗" / "Open in Copilot ↗"** outline links on the white For you cards | `ExternalLink.module.css` `.link` | 8px | radius-default, **4px** |
| 7 | **"Featured" cards**: skill-builder, Document Extraction, Qwen3.6-27B | `FeatureCard.module.css` `.card` | 14px | radius-default, **4px** |
| 8 | **Small tags** on the Featured cards: SKILL, TOOL, MODEL, ubs-wide-shared, LIVE WITH LIMITS, UBS-HOSTED | `Tag.module.css` `.tag` | 4px | radius-mini, **2px** |
| 9 | **"Try in Navigator →" bars** at the bottom of the skill and tool cards, and the disabled "Set as model in Navigator" bar on the model card | `TryAction.module.css` `.action` | 9px | radius-default, **4px** |
| 10 | **"Start a conversation"** black button in the closing strip at the bottom ("Not sure where to start?") | `ActionButton.module.css` `.solid` (overrides the base) | 10px | radius-default, **4px**; remove the override or set it to 4px |
| 11 | **Photo-strip badges** (SKILL / TOOL floating on the top-left of the Featured card photos), if implemented | the Featured card media component | 5px | radius-mini, **2px** |

## Search input: use `SearchBox`

**What it is:** the search input inside the search panel (#2). Right now it's a light-gray input box with a separate red "Ask Navigator" button beside it.

**Change:** replace the input and the button with the **`SearchBox`** component from our components package. We already implement this style there, so don't restyle it locally.

- It's one bordered field with its buttons inside, at the right end.
- It has two buttons: **Search** (secondary) and **Ask Navigator** (primary). The MVP ships with both.
- Enter triggers Ask Navigator.
- Wire Search to the page's search handler, and Ask Navigator to the existing "ask Navigator" handler (probably `onAskNavigator`).
- Placeholder: `"Search Claves, or ask Navigator to do it for you…"`
- Keep the suggestion chips below it, inside the panel.
- Once `SearchBox` is in, delete the now-unused local input/button styles from `SearchPanel.module.css`.

Also tone down the search panel (#2) now that the field has its own border:
- add a border `1px solid rgba(0,0,0,.1)`
- box-shadow `0 8px 24px rgba(0,0,0,.1)` (was `0 12px 34px rgba(0,0,0,.16)`)

## Done when

- `grep -rn "border-radius" home/` shows only `4px /* radius-default */`, `2px /* radius-mini */`, `0`, or `999px` on avatars.
- The search panel renders `SearchBox` with Search (secondary) and Ask Navigator (primary) inside the field.
- Nothing else moved.

Finish with a short list of each change and the file it landed in, plus anything you couldn't find.
