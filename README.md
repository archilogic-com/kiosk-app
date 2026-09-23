# Floor plan kiosk

A wall-mounted kiosk built with the [Archilogic Floor Plan SDK](https://developers.archilogic.com/floor-plan-engine/guide.html), the kind of screen you put in a lobby or by a lift. It shows the floor, lets someone search for a space or a colleague, and draws them a walking path to it.

It is a worked example: one complete application rather than a set of snippets, showing how the SDK's queries, theming, markers and drawing layers fit together.

## What it does

- **Search** spaces and people, or filter by [space category](https://developers.archilogic.com/space-graph/spaces.html) (work, meet, care, socialize, support)
- **Wayfinding**: a walking path from the kiosk to any space or workstation, with distance, an estimated walking time and turn-by-turn directions
- **Draggable origin and destination**, so you can route between any two points
- **People finder**: avatar markers on occupied workstations, driven by custom attributes
- **Dashboard**: attendance, free meeting rooms, today's events and the weather
- **Live theming**: an editor over the SDK's theme API, with four presets
- **Deep links**: `?to=<id>&type=space&directions=1` opens straight on a destination, so a QR code or a calendar invite can point at a room
- **Any floor**: `?floor=<id>&token=<token>` points the kiosk at another floor without a rebuild
- **Idle reset**: returns to the dashboard when nobody is using it

## Running it

```bash
npm install
npm run dev
```

That runs against a public demo floor, so it works with no account and no configuration.

### Pointing it at your own floor

You need an Archilogic account with a floor in it.

1. Create a **publishable access token** at [app.archilogic.com → Settings → Access tokens](https://app.archilogic.com/organization/settings/access-tokens), allowing the domains you will serve from.
2. Open your floor in the Archilogic dashboard and copy its **floor id** from the URL.
3. Either pass both in the URL, or copy `.env.example` to `.env` and fill them in to make them the defaults for a build.

A publishable access token is designed to ship in a browser bundle: it is domain-restricted and read-only. It is not a secret, which is why the demo values are committed and why it can go in a URL.

#### URL parameters

Every setting resolves from the URL first, then the environment, then the demo floor, so a running kiosk can show any floor without a rebuild:

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

These parameters survive a reload, and links copied from the kiosk keep them, so a shared link opens on the same floor.

To show occupants on workstations, define [custom attributes](https://developers.archilogic.com/space-graph/custom-attributes.html) on your floor's workstation assets and pass their `apiFieldName`s as above. Without them everything else still works; the people finder is simply empty.

## How it is put together

The application is split so that the half that knows about floor plans does not know about React:

```
src/
  core/            no framework imports, enforced by the linter
    index.ts       the surface a UI binds to
    domain/        spaces, workstations, search, stats, selectors, formatting
    theme/         theme construction and presets
    highlight/     what is tinted on the plan, and why
    wayfinding/    path geometry and turn-by-turn directions
    sdk/           talks to the Floor Plan SDK: loading, queries,
                   markers, layers. Framework-free, but not pure.
    demo-data/     stand-in events, weather and equipment
  hooks/           thin React bindings over core
  components/      the React UI
```

`src/core` is the part worth reading if you are building your own kiosk, and the part you would keep if you built the UI with something other than React. `src/core/sdk` is the exception to "pure": it holds a live engine instance and creates DOM, but it has no framework in it. The header of `src/core/index.ts` lists the seven places a UI attaches.

Two rules hold the rendering together:

- **One writer.** `applyTheme` is the only thing that calls `floorPlan.set({ theme })`, and it always writes a complete theme, since a partial update would clobber the styles the engine is currently rendering with.
- **One source of truth for highlighting.** Hover, selection, category filters and search results all resolve through `computeHighlights` into a single set of node styles. Nothing paints the plan imperatively, so nothing has to reconstruct a previous colour in order to undo itself.

## A note on the pinned SDK version

`@archilogic/floor-plan-sdk` is pinned to an exact snapshot build rather than a release range. The wayfinding in this example is built on `floorPlan.getPath({ start, end })`, which is available in that snapshot but not in the current stable release. **Changing the dependency will break pathfinding** until `getPath` ships in a stable version.

Everything else here (queries, theming, markers, drawing layers, deep links) works against the current stable SDK.

## Commands

```bash
npm run dev        # dev server on :5173
npm run build      # production build
npm run preview    # serve the production build
npm test           # unit tests for src/core
npm run test:e2e   # browser smoke tests (needs `npx playwright install chromium`)
npm run typecheck  # tsc --noEmit
npm run lint       # oxlint
npm run check      # prettier --write && oxlint --fix
```

## Requirements

Node 24 (see `.nvmrc`). Using the SDK requires an agreement with Archilogic; see the [developer documentation](https://developers.archilogic.com) to get started.

## License

MIT. See [LICENSE](./LICENSE). The Floor Plan SDK itself is licensed separately, under your agreement with Archilogic AG.
