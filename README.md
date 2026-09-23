# Floor plan kiosk

A wall-mounted kiosk app built with the [Archilogic Floor Plan SDK](https://developers.archilogic.com/floor-plan-engine/guide.html), the kind you'd find in a lobby or by the lifts. It shows the floor, lets visitors search for a room or a colleague, and draws a walking route to get there.

The code shows how the SDK's queries, theming, markers and drawing layers work together in a complete app.

## What it does

- **Search** for spaces and people, or browse by [space category](https://developers.archilogic.com/space-graph/spaces.html) (work, meet, care, socialize, support)
- **Wayfinding** from the kiosk to any space or workstation, with the distance, walking time and turn-by-turn directions
- **Draggable start and end points**, so you can route between any two places
- **People finder** that shows avatars on occupied workstations, based on custom attributes
- **Dashboard** with attendance, free meeting rooms, today's events and the weather
- **Theme editor** built on the SDK's theme API, with four presets
- **Deep links** like `?to=<id>&type=space&directions=1` that open straight on a destination, handy for QR codes or calendar invites
- **Any floor** via `?floor=<id>&token=<token>`, with no rebuild needed
- **Idle reset** back to the dashboard after a minute without use

## Running it

```bash
npm install
npm run dev
```

This uses a public demo floor, so you don't need an account or any configuration.

### Using your own floor

You'll need an Archilogic account with at least one floor.

1. Create a **publishable access token** at [app.archilogic.com → Settings → Access tokens](https://app.archilogic.com/organization/settings/access-tokens), and allow the domains you'll serve the kiosk from.
2. Open your floor in the Archilogic dashboard and copy the **floor id** from the URL.
3. Pass both as URL parameters, or copy `.env.example` to `.env` and fill them in to make them the default for your build.

Publishable tokens are meant to be used in the browser. They're read-only and only work on the domains you allow, so they aren't secret. That's why the demo token is committed to the repo, and why it's fine to put one in a URL.

#### URL parameters

The kiosk reads each setting from the URL first, then from the environment, and falls back to the demo floor. So a running kiosk can switch to another floor without a rebuild:

```
?floor=<floor id>&token=<publishable access token>
```

| Parameter             | Environment variable                       | Purpose                                                                                   |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `token`               | `VITE_ARCHILOGIC_PUBLISHABLE_ACCESS_TOKEN` | Publishable access token. It must allow the domain the kiosk is served from.              |
| `floor`               | `VITE_ARCHILOGIC_FLOOR_ID`                 | Floor to show (its default layout).                                                       |
| `layout`              | `VITE_ARCHILOGIC_LAYOUT_ID`                | One specific layout, used when no floor is given.                                         |
| `spaceApiUrl`         | `VITE_ARCHILOGIC_SPACE_API_URL`            | Space API for another tenant. From the URL it must be an `https://*.archilogic.com` host. |
| `occupantAttribute`   | `VITE_ARCHILOGIC_OCCUPANT_ATTRIBUTE`       | `apiFieldName` of the workstation attribute holding the occupant's name.                  |
| `employeeIdAttribute` | `VITE_ARCHILOGIC_EMPLOYEE_ID_ATTRIBUTE`    | `apiFieldName` of the workstation attribute holding an employee id.                       |

The parameters stay in place after a reload, and links copied from the kiosk include them, so a shared link opens on the same floor.

To show who sits where, add [custom attributes](https://developers.archilogic.com/space-graph/custom-attributes.html) to the workstation assets on your floor and pass their `apiFieldName`s as shown above. Everything else works without them; the people finder will just be empty.

## How it's put together

All the code that talks to the Floor Plan SDK lives in `src/floor-plan/`, with one file per feature, so you can see how the kiosk uses each part of the SDK without digging through the rest of the app.

```
src/
  main.tsx               starts loading the floor before React mounts
  Kiosk.tsx              wires the visitor's state to the floor plan (start here)
  config.ts              which floor and token, from the URL, the environment or the demo
  kiosk-state.ts         spaces, people and events; the state machine; search
  demo-data.ts           stand-in events, weather and meeting-room equipment
  floor-plan/
    engine.ts            create the engine, load and frame the floor, read its
                         spaces and workstations, resolve clicks
    theme.ts             default styles, presets, and the theme and visibility
                         passed to `floorPlan.set`
    highlights.ts        what is tinted on the plan, and why
    wayfinding.ts        `getPath`, the drawn route, its pins, and turn-by-turn directions
    markers.ts           HTML markers: route pins and people avatars
  components/            the rest of the UI: dashboard, search, details, map controls
```

If you only read one file, make it `Kiosk.tsx`. Everything the kiosk does with the plan (theming, highlights, clicks, routing and the people markers) is a few lines there that call into `floor-plan/`.

### Drawing the plan

`Kiosk.tsx` makes the only `floorPlan.set({ theme, visibility })` call, and `floorPlanStyle` always builds the full theme. The engine merges each new theme with its own defaults, so a partial theme would lose everything it leaves out. Hidden element types, furniture and labels use the SDK's `visibility` option.

`computeHighlights` turns every highlight (hover, selection, category filters, search results, the dashboard's events and the route's destination) into one list of node styles. Nothing paints the plan directly, so clearing a highlight never means restoring an old colour.

## A note on the pinned SDK version

`@archilogic/floor-plan-sdk` is pinned to an exact snapshot build. Wayfinding uses `floorPlan.getPath({ start, end })`, which is in that snapshot but not yet in a stable release. **Changing the dependency will break pathfinding** until `getPath` is released.

Everything else (queries, theming, markers, drawing layers, deep links) works with the current stable SDK.

## Commands

```bash
npm run dev        # dev server on :5173
npm run build      # production build
npm run preview    # serve the production build
npm test           # unit tests
npm run test:e2e   # browser smoke tests (needs `npx playwright install chromium`)
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run check      # prettier --write && oxlint --fix
```

## Requirements

Node 24 (see `.nvmrc`). Using the SDK requires an agreement with Archilogic. The [developer documentation](https://developers.archilogic.com) explains how to get started.

## License

MIT, see [LICENSE](./LICENSE). The Floor Plan SDK itself is licensed separately under your agreement with Archilogic AG.
