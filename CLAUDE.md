# Generator for WP

A WordPress code-generator site: 38 tools (Readme Studio + 37 `register_*`/`WP_Query`-style
generators) that turn a form into copy-pasteable, production-ready PHP. Every generator runs
entirely client-side — no backend, no accounts, nothing uploaded.

## Origin

This app is a port of a claude.ai/design prototype (project `f21da10a-6d16-41eb-a34f-431cecb482e1`,
"WordPress plugin readme builder"). The original design used a custom preview DSL (`.dc.html`
files: `{{ }}` interpolation, `<sc-if>`, `<sc-for>`, `<dc-import>`, a `class Component extends
DCLogic` runtime). That was a *design tool format*, not a runnable app — but the `<script
type="text/x-dc" data-dc-script>` block in each `.dc.html` file contained real, complete WordPress
code-generation logic (state shape, validation, PHP-building functions), which is what got ported.

The raw source files are kept under `design-reference/` for reference (read-only — not part of the
build, not imported by any app code). If you're implementing or fixing a generator and the current
port looks incomplete or wrong, the original logic is there to check against.

## Stack

- Vite + React 18 + TypeScript
- React Router v7 (`createBrowserRouter`, data mode) — chosen because a future login/paid-plan
  flow benefits from route `loader`/`action` support and protected-route patterns without a rewrite
- Plain CSS (custom properties in `src/styles/tokens.css`, component classes in
  `src/styles/components.css`) — no Tailwind, no CSS-in-JS. The original design used precise
  per-element inline styles; those are preserved as inline `style={{}}` for one-off layout, with
  everything reusable (buttons, chips, cards, inputs, code panels) promoted to a real class so
  `:hover`/`:focus` work (inline styles in React can't express pseudo-states, so hover/focus
  states live in `components.css`, never as inline style overrides)

## Structure

```
src/
  data/tools.ts          catalog of all 38 tools (id, name, category, fuzzy-search) — single
                          source of truth for Home/ToolsIndex/SiteHeader/SiteFooter
  lib/
    codegen.ts            shared codegen helpers: slugify, escPhp, alignBlock (aligns PHP `=>`),
                           withCredit, tokenizePHP (the PHP syntax highlighter used by every
                           CodePreview), ValidationIssue type
    useEditorState.ts      the hook every generator uses for its form state: commit()/undo()/
                            redo()/reset(), localStorage persistence, and a "Saved just now"
                            label — the undo history and autosave chrome every toolbar shows
    auth/                 AuthContext + ProtectedRoute — see Auth section below
  generators/
    registry.tsx           tool id -> lazy-loaded page component. Add one line here per tool.
    <tool>.ts               pure logic per tool: types, defaults, build*()/validate()/applyFix().
                            No React, no JSX — this is what you'd unit test if tests get added.
  components/
    ui/                    generic primitives (Icon — renders Heroicons (24/outline) components
                            by name, see Icon section below; Collapsible;
                            Toggle/ToggleRow — the role="switch" iOS-style pill used for every
                            boolean field, never a native <input type="checkbox">; CheckboxChip
                            — the role="checkbox" pill with an inner check-square, used for
                            multi-select fields, see the field-card section below)
    generator/             shared generator-page building blocks: GeneratorShell (breadcrumb,
                            IDE-style toolbar — file badge/saved label/undo-redo/New/Copy/
                            Download — and a tabbed output panel: primary code tab, an optional
                            tool-specific secondary tab, and a Checks tab), CodePreview (dark
                            panel, PHP highlighting — purely presentational, no buttons of its
                            own), ValidationList (warnings + one-click fixes, rendered inside
                            GeneratorShell's Checks tab)
    readme/                Readme Studio's block editor + ListingPreview
  layout/                  SiteHeader, SiteFooter, RootLayout (the site chrome, real React
                            Router Link/NavLink instead of the original's hash routing)
  pages/
    Home.tsx, ToolsIndex.tsx, About.tsx, Contact.tsx
    generators/            one page per tool, e.g. PostTypeGenerator.tsx, plus GeneratorRoute.tsx
                            (the /tools/:toolId route that looks the id up in the registry)
    auth/                  Login, Account, Pricing placeholders
  router.tsx               all routes, wired centrally (see Registry pattern below)
```

## Registry pattern (important — read before adding a generator)

Every generator page is code-split and looked up by id at `/tools/:toolId` via
`src/generators/registry.tsx`. To add or wire up a tool:

1. Create `src/generators/<slug>.ts` (pure logic: types, defaults, `build*()`/`validate()`/
   `applyFix()`) and `src/pages/generators/<Name>Generator.tsx` (the page — see the pattern below).
2. Add one line to `GENERATOR_REGISTRY` in `src/generators/registry.tsx` mapping the tool's `id`
   (from `src/data/tools.ts`) to a lazy import of the new page.

That's it — `src/router.tsx` never changes per tool; it only has the single `/tools/:toolId` catch-all
route. This was deliberately kept as one shared file so parallel work on different tools never
touches the same lines.

### The page pattern (every tool follows this — `PostTypeGenerator.tsx` is the canonical example)

```tsx
const { state, commit, undo, redo, reset, canUndo, canRedo, savedLabel } =
  useEditorState<MyType>('my-tool-v1', freshProject);

<GeneratorShell
  category="content" title="..." description="..."
  code={generatedCode} filename="thing.php"        // language="plain" if not PHP (e.g. JSON)
  editor={{ canUndo, canRedo, onUndo: undo, onRedo: redo, onNew: reset, savedLabel }}
  issues={issues} onFix={fix} onFocusField={focusField}
  outputModes={MODES} activeOutputMode={mode} onOutputModeChange={setMode}  // if the tool has more than one output shape
  secondaryTab={{ label: 'Reference', content: <>...</> }}                  // optional — only if there's genuine read-only reference/summary content
  form={<div>...actual editable fields...</div>}
/>
```

`GeneratorShell` owns the toolbar (file badge, saved-just-now label, undo/redo buttons wired to
Cmd/Ctrl+Z, an error/warning pill that jumps to the Checks tab, New/Copy/Download) and the tabbed
output panel (primary code tab + optional secondary tab + Checks tab rendering `ValidationList`)
— no page builds any of that itself. `useEditorState` owns persistence and undo history — no page
calls `localStorage` directly. Never put an inline `<ValidationList>` in a page's `form` anymore;
`issues`/`onFix`/`onFocusField` at the top level of `GeneratorShell` is the only path.

The code panel (`CodePreview`) is a **light** panel (`#FBFAF7` background) — this was wrong for a
while (built as a dark panel copied from the homepage's marketing hero snippet, which really is
dark) and got fixed after comparing against the actual source. Don't reintroduce a dark theme
there; the token colors in `tokenizePHP` are tuned for the light background.

Every boolean field uses `Toggle`/`ToggleRow` from `src/components/ui/Toggle.tsx` (a real
`role="switch"` pill with a sliding knob), never a native `<input type="checkbox">`. Group related
toggles in a `.toggle-card` (bordered card + `.toggle-card-title`); a single toggle tied to a
conditionally-shown field below it stays bare (`<Toggle>` + a label span, no card) — see
`PostTypeGenerator.tsx`'s "Behaviour" card vs. its "Rewrite permalinks" toggle for both cases.

### Repeatable rows: `RepeatableCard` (every add/remove list, no exceptions)

Every repeatable item — anything the user can add more than one of (fields, args, clauses,
columns, rules, assets, headers, blocks…) — renders through
`src/components/ui/RepeatableCard.tsx`. It owns the whole row chrome: a header bar with drag
handle, title, mono subtitle, move up, move down, trash and collapse, over a muted-beige
(`--gfw-surface-muted`) body that is already a gapped flex column. Pages supply only the row's
own fields as `children`.

**This overrides the design handoff.** Most `.dc.html` sources render a repeatable row as a plain
bordered div with a single ✕; before this was unified the 32 tools with lists had ~5 different
row treatments (`.card`, hand-rolled bordered divs with three different backgrounds, bare flex
rows, chips) and inconsistent controls (some had ↑↓, some ✕ only, Shortcode had ↑ but no ↓, most
had no reordering at all). Keep a source's fields and logic; render them through this card.

Move/remove/reorder handlers come from `useListOps(commit)((p) => p.someArray)`
(`src/lib/useListOps.ts`) so ordering semantics and undo entries are identical everywhere — never
hand-roll them per tool. Drag binding comes from `useDragReorder()` (`src/lib/dragReorder.ts`,
promoted out of `components/readme/` when this went app-wide). The dashed "Add X" button that
follows a list gets `className="btn btn-ghost btn-sm repeatable-add"`.

Two deliberate non-conversions: **tag-style chip lists** (Post Type / Taxonomy / WP_Query custom
post-type and taxonomy inputs) stay compact `.chip` pills — a header bar per tag would be a
downgrade — and **HooksGenerator's `params`**, whose length is driven by a count `<select>`, not
by add/remove.

### Tab naming

A tab that renders an interactive/live mockup is labelled **`Preview`**, never a tool-specific
name. The objective test is whether it paints WP-admin chrome (`#F0F0F1` / `#C3C4C7`); that is
what turned Screen / Editor / Dashboard / Form / Themes / Sample cart / Product data / Listing
Preview into one shared `Preview` label. Read-only reference panels stay `Reference`. Tabs that
are neither — a computed table, a file tree, URL examples, or a genuine second generated file
(`Matrix`, `Structure`, `Permalinks`, `Load map`, `Calling it`, `Usage`, `Summary`, `Template`,
`CSS vars`, `Raw readme.txt`) — keep their own names, because calling them "Preview" would
misdescribe them.

### Section wrapping: `.field-card` / `.field-subcard`

Every logical form section is wrapped in a bordered card, matching the source's exact grouping —
never invent groupings, always check the corresponding `design-reference/*.dc.html` file for what
it actually groups together.

- `.field-card` — plain white bordered card (`#fff`, 1px border, 8px radius, 18px padding) wrapping
  one section's fields. Add `.field-card-primary` (sunken cream background) for the *first*
  section only — the one with the tool's main identity fields (name/key/slug-type things).
  Give every card a `.field-card-title`; if the source shows a description/note next to the title
  (e.g. a live count, a computed summary), wrap both in `.field-card-header` (title +
  `.field-card-desc`, flex space-between) instead of a bare title.
- `.field-subcard` — smaller nested card (muted background, 7px radius) for sub-groups *inside* an
  "Advanced" `Collapsible` (e.g. "REST API", "Permalinks & rewrite", "Capabilities"). Gets its own
  `.field-subcard-title`.
- Multi-select fields (pick any number — e.g. "Supports", "Taxonomies", HTTP methods, argument
  "required" flags) use `<CheckboxChip active={bool} onClick={...}>` from
  `src/components/ui/CheckboxChip.tsx` — a pill with a small checkbox square + real `check` glyph
  inside. Only convert a chip field to `CheckboxChip` if the *source* markup has
  `role="checkbox"` with a `boxBorder`/`boxBg`/`check` inner span — grep the `.dc.html` file to
  confirm before converting. Single-select fields (only one active at a time — output-mode
  switchers, HTTP-method-as-radio, sort order) stay plain `.chip` buttons; most tools have no
  `role="checkbox"` fields at all, so don't force a conversion where the source doesn't have one.

`PostTypeGenerator.tsx` demonstrates every one of these patterns in context (field-card,
field-card-primary, field-card-header, CheckboxChip, field-subcard) and is the reference to copy
from when retrofitting or building a new tool page.

Copy buttons (toolbar Copy, the code panel's in-panel Copy, and any secondary-tab Copy) use
`useCopyFlash` (`src/lib/useCopyFlash.ts`) — flips the label to "Copied" for 1.6s, matching the
source's `copiedFlash` state. `GeneratorShell` owns one instance for the primary `code`. A
secondary tab that is a genuine second generated file (not a structured reference view) gets its
own dedicated Copy button via `<CopyableCodePreview code={...} filename={...} />`
(`src/components/generator/CopyableCodePreview.tsx`) instead of a bare `<CodePreview>` — e.g. Nav
Menu/Sidebar's "Template" tab, theme.json's "CSS vars" tab, Readme Studio's "Raw readme.txt" tab.
Most secondary tabs (Permalinks, Reference, Summary, Usage, Calling it, Screen, Editor, Load map)
are structured read-only reference views, not a single blob of generated text, and correctly have
no copy button at all — check the source's own `onCopy`/`copyCode()` before adding one; don't add
a copy button just because a tab exists.

`ValidationList` (the shared Checks-tab panel) has its own severity filter chip row (All/Errors/
Warnings/Tips counts, local `useState`) — this is automatic for all 38 tools since they all render
through the same component; don't re-implement filtering per tool.

Every icon-only button (no visible text label) must have a `title` attribute so a native tooltip
shows, in addition to `aria-label` for screen readers — the two serve different purposes and both
belong on the same button. The source itself is inconsistent about this (some icon buttons only
have `aria-label`), but this project holds itself to full coverage regardless of what the source
did.

Readme Studio's rich-text fields (paragraph/blockquote/FAQ answer/changelog & notice description)
use `RichTextEditor` (`src/components/readme/RichTextEditor.tsx`), built on Tiptap
(`@tiptap/react`/`@tiptap/starter-kit`/`@tiptap/extension-link` — StarterKit already bundles
BulletList/OrderedList/ListItem, no separate packages needed) restricted to Bold/Italic/Code marks
+ Link + real bulleted/numbered lists — no headings or other marks/nodes StarterKit bundles. There
is **no standalone "List" block type** in the Description/Installation block editor (removed) —
lists are authored directly inside a paragraph block's rich text via the toolbar's list buttons,
same as any other WYSIWYG. The component's `value`/`onChange` contract is a markdown-ish string
(`**bold**`/`*italic*`/`` `code` ``/`[text](url)`, with `* item`/`1. item` lines for lists) that
`readmeStudio.ts`'s `tokenizeInline`/`segmentText` also understand — `segmentText(text)` is the
shared "split into paragraph-runs and list-runs" helper used by `mapPreviewBlocks` (Description/
Installation preview), `ListingPreview.tsx`'s `SegmentedText` (FAQ/changelog/notice preview — those
render real lists too, not just the block editor), and `RichTextEditor.tsx`'s local
`mdToTiptapHtml` (content-seeding, converts list-line runs to real `<ul>/<ol>`) and
`docToMarkdown`/`nodeToMarkdown` (serializing Tiptap's `bulletList`/`orderedList` JSON nodes back to
`* item` lines). Don't change `segmentText`'s line-grouping regex without checking all of those
consumers plus `parseGenericBody` (readme.txt import), which uses the identical grouping logic.
Old saved projects with a legacy `type: 'list'` block are migrated once on load via
`migrateLegacyListBlocks` (called from a mount-only `useEffect` in `ReadmeStudio.tsx`) into an
equivalent paragraph block with literal `* item` text — don't remove that migration, it's the only
thing preventing pre-existing localStorage data from silently losing its lists.

The toolbar is Bold/Italic/Code/Bulleted-list/Numbered-list/Link/Clear-formatting (`.rte-toolbar-btn`
in `components.css`) and reflects live editor state — every button gets an `is-active` class when
`editor.isActive('bold')` etc is true, kept in sync by subscribing to Tiptap's own `transaction`
event (`editor.on('transaction', ...)` in a `useEffect`, forcing a re-render) rather than relying on
`@tiptap/react` to do it implicitly. The Link button opens a small anchored popover
(`.rte-link-popover`) with a URL input — pre-filled with the current href and offering "Remove" when
the cursor is already inside a link, "Apply"/Enter otherwise — instead of silently inserting a
`https://` placeholder. Blockquote is not offered in the Description/Installation "add element" row
(`ADDABLE_BLOCK_TYPES` in `ReadmeStudio.tsx` filters it out) but the block type, its
`RichTextEditor`'s `blockquote` prop styling, `blockToText`/`mapPreviewBlocks` handling, and
`parseGenericBody`'s `> quoted` readme.txt parsing are all still intact — existing/imported
blockquote blocks keep rendering and editing normally, only *adding a new one* from the UI is
disabled for now. Tiptap noticeably
grows the Readme Studio bundle (its own chunk is ~140KB gzipped, versus code-split per-tool chunks
elsewhere that run 5–30KB) — an accepted tradeoff for a more robust editor, not a regression to
chase down. Tiptap's `editor.view`/`.commands` can throw if accessed after the editor is destroyed
(React StrictMode's dev-only mount/cleanup/remount) even though the `editor` object itself is still
non-null — guard with `editor.isDestroyed`, not just `!editor`.

Two escape hatches exist on `GeneratorShellProps` for tools that don't fit the code-preview mold:
`primaryTabLabel`/`primaryTabContent` (override the primary tab's content entirely — Readme
Studio uses this for its rendered Listing Preview instead of a code panel) and `extraActions`
(extra toolbar buttons before New/Copy/Download — Readme Studio's single "Import" button, which
opens a `position:fixed` modal containing both the readme.txt import UI and the project-JSON
export/import buttons — Export is not a separate toolbar button, matching source). Both exist for
exactly one tool today; reach for them only when a tool is genuinely not a single code output, not
as a general escape from the pattern above.

`GeneratorShell`'s workspace has no fixed max-height — the whole page grows when a form section
(e.g. an "Advanced" `Collapsible`) expands, rather than scrolling inside a viewport-clamped box.
On desktop (`viewportWidth >= 1024`, tracked via a `resize` listener), the two-column split becomes
resizable: a 6px `.gen-pane-resizer` drag handle between the form and output columns, backed by
`rightPaneWidth`/`resizingPane` state and window-level `mousemove`/`mouseup` listeners while
dragging (clamped 340px..`workspaceWidth-420`, default 520px, matching source's exact formula).
Below 1024px the columns stay a plain fixed-width CSS Grid split (no resizer) down to the existing
780px mobile breakpoint, where they stack. Don't reintroduce `overflow:hidden`/fixed heights on
`.gen-workspace`/`.gen-form-col`/`.gen-tab-panel`/`CodePreview` — that was a deliberate change away
from the source's own IDE-in-a-box height clamp, per explicit user preference, not a source-parity
bug.

There is no build-status/roadmap concept anywhere in the app — `Tool` (`src/data/tools.ts`) has no
`status` field (all 38 tools are equally "done"; the field was removed, not just hidden) and no
page shows a "Live"/"In build"/"Planned" badge. Home.tsx's featured section is a plain grid of the
12 most useful tools (`FEATURED_IDS`) with categories below and a link to all tools — no special
single-tool spotlight card, no "N live / N in build" hero copy. Don't reintroduce status-based
filtering, sorting, or badging when adding new tools or editing these pages.

## Known gaps / follow-ups

- The 4 reference screenshots under `design-reference/uploads/pasted-*.png` were fetched through a
  256KB-capped tool and are truncated (real dimensions are much taller) — they're best-effort
  reference only, not used by the app.
- Icons render via `@heroicons/react/24/outline` — `src/components/ui/Icon.tsx` maps each
  `IconName` to a Heroicons component and renders it sized via `style={{width,height}}`, color via
  `currentColor` (inherits from CSS, same as before). This replaced an earlier Lineicons-webfont
  approach (codepoints copied verbatim from the source design's own `ICON`/`LNI` lookup tables) —
  that font build turned out to have no real bulleted/numbered-list glyph at all, and the source's
  own codepoints for them (`e064`/`e110`) resolved to unrelated icons (`lni-align-text-left`/
  `lni-badge-number`) once cross-checked against the complete Lineicons icon-name-to-codepoint map
  from the handoff zip — confirmed the exact same font file we shipped, so it wasn't a version
  mismatch on our end, just a mislabeling in the original design source itself. Rather than keep
  chasing individual codepoint mismatches, the whole icon system moved to Heroicons, which has
  real `ListBulletIcon`/`NumberedListIcon` and everything else needed. The `lineicons.woff*` font
  files and its `@font-face` block are gone; don't reintroduce them.
- No automated tests yet.
- PHP syntax highlighting (`tokenizePHP` in `src/lib/codegen.ts`) is a regex tokenizer ported from
  the source design, not a full parser — fine for generated code (which is narrow and predictable)
  but don't expect it to handle arbitrary PHP correctly.
- Readme Studio's readme.txt **import** is fully implemented (`parseReadmeText` in
  `src/generators/readmeStudio.ts`), including a round-trip check against
  `design-reference/uploads/readme.txt`. Project JSON import/export also works.

## Auth & future payments (scaffolded, not implemented)

No login or billing exists today — every generator is free and anonymous. The seams are in place
so adding either later doesn't require restructuring:

- `src/lib/auth/AuthContext.tsx` — `useAuth()` context with `user`/`status`/`signIn`/`signOut`.
  Currently backed by localStorage as a mock (no real backend call). Swap the body of `signIn`/
  `signOut` for a real provider (session cookie, JWT, Clerk/Auth.js/etc.) without touching any
  page that calls `useAuth()`.
- `src/lib/auth/ProtectedRoute.tsx` — wraps a route element, redirects to `/login` if
  unauthenticated. Not used by any route yet (`/account` is the only example).
- Reserved routes already in `src/router.tsx`: `/login`, `/account` (protected), `/pricing`
  (placeholder — no plans/pricing table yet).
- `AuthUser.plan: 'free' | 'pro'` already exists on the user type as a hook for a future paid tier.

When real auth/payment work starts: decide on a provider, wire it into `AuthContext`, then decide
per-tool whether anything needs to sit behind `ProtectedRoute` (e.g. saved projects, paid export
formats) — most generators likely stay fully free/anonymous by design (that's a stated selling
point on the About page: "Accounts required: 0").

## SEO: prerendering, sitemap, and structured data

The app is a pure client-side SPA (`createRoot().render()`, not SSR/hydration — see Auth section
below for why `useEditorState`/`AuthContext` reading `localStorage` during first render rules out
a Node-based `renderToString` approach without touching every generator). Crawlability instead
comes from a **post-build headless-browser crawl** (`scripts/prerender.ts`, using `playwright-core`
+ `vite preview`) that visits the app's own already-working client render for every public route
and saves the resulting DOM as static HTML. This is real content-in-the-initial-response for
crawlers/social scrapers, not a build-config toggle — Google's own guidance for JS sites explicitly
endorses this "static rendering" pattern as an alternative to full SSR.

- `scripts/routes.ts` — the single source of truth for every public route (home, tools index,
  about, contact, login, pricing, all 6 category hubs, all 48+ tool pages), derived directly from
  `src/data/tools.ts`. Add a tool there and it automatically appears in the sitemap and the
  prerender crawl — nothing else to maintain by hand.
- `npm run sitemap` — regenerates `public/sitemap.xml` from `routes.ts` (only routes marked
  `sitemap: true`; `/login`/`/pricing` are prerendered for a correct static shell but intentionally
  excluded from the sitemap since they're `noindex`).
- `npm run prerender` — runs `vite build`, then crawls every route from `routes.ts` with a real
  headless Chromium (bounded concurrency, waits for network-idle + the lazy-load fallback text to
  be gone + the footer to exist before snapshotting), and writes the result into `prerendered/`
  (a **committed, source-controlled** folder — not `dist/`, which is gitignored and rebuilt fresh
  every deploy). `/account` is deliberately excluded — it's auth-gated and would just snapshot a
  misleading redirect, so it stays a pure client-rendered route like any other private page.
- **This must never run as part of Vercel's build** — a 300MB Chromium download plus a full crawl
  on every single push would be wasted cost for content that usually hasn't changed. `playwright`
  (the full package, which auto-downloads browsers via postinstall) is deliberately NOT a
  dependency; `playwright-core` (no auto-download) is, so `npm install` on Vercel can never trigger
  a browser download regardless of caching behavior. Run `npx playwright install chromium` once
  locally before the first `npm run prerender`.
- `scripts/copy-prerendered.mjs` — the *only* prerender-related step that runs during
  `npm run build` (and therefore on Vercel). It's dependency-free text processing, not a crawl: it
  overlays the committed `prerendered/` snapshots onto the `dist/` that `vite build` just produced,
  and — critically — **rewrites every snapshot's `<script type="module">`/`<link rel="stylesheet">`
  tags to match whatever `vite build` just actually emitted**, regardless of what hash the snapshot
  itself was crawled against. This means forgetting to run `npm run prerender` before a push that
  changes the JS bundle's content hash degrades gracefully to stale *content* on that page (still
  showing the last-crawled copy) rather than a broken page (a missing/404 JS bundle reference that
  would leave the SPA unable to boot) — verified by deliberately building against a stale
  `prerendered/` snapshot and confirming the served `dist/index.html` still resolved to the
  currently-existing asset file. Workflow: after any change that should be reflected in what
  crawlers see, run `npm run refresh-seo` (sitemap + prerender) locally and commit `prerendered/`
  and `public/sitemap.xml` alongside the code change, same push as always via GitHub Desktop —
  Vercel's own build stays exactly as fast as it's always been.
- Structured data (JSON-LD): `WebApplication`/`Organization` are static in `index.html` (present
  before any JS runs). `BreadcrumbList` (tool pages, category hubs) and `FAQPage` (homepage) are
  route-dependent, so they're injected via `src/lib/useJsonLd.ts` — same "find-by-id, update
  in place" pattern as `usePageMeta`, so navigating client-side after the prerendered page loads
  doesn't duplicate tags.
- Real HTTP 404s for bad `/tools/:id` and `/category/:cat` paths come from `middleware.ts` (Vercel
  Edge Middleware, checked against the same `src/data/tools.ts` id lists) — the static rewrite in
  `vercel.json` alone would return 200 for anything, the classic SPA soft-404. Unlike the prerender
  crawl, this **does** run on every request in production (it's tiny, no browser involved) but
  never during the build.

## Analytics (GA4)

Manual tracking, not GA4's own history-based auto-tracking — this is a client-routed SPA, and
auto-tracking can't guarantee `document.title` is already updated by the time it fires (it also
would have double-fired against the manual tracking below if both were left on).

- `index.html`'s `GA4_BOOTSTRAP_START`/`_END` block loads `gtag.js` with `send_page_view: false`,
  reading the measurement ID from `VITE_GA_MEASUREMENT_ID` (`%VITE_...%` Vite HTML env
  substitution — set it in `.env.local` for local dev, and separately in Vercel's project env vars
  for production; see `.env.example`). If unset, Vite leaves the literal `%VITE_...%` placeholder
  in place rather than blanking it — the bootstrap script checks for that and no-ops, so a missing
  env var degrades to "analytics off," never a crash.
- `src/lib/usePageMeta.ts` fires the actual `page_view` (via `src/lib/analytics.ts`'s
  `trackPageView`) at the end of its effect, using the exact title/path it just set — every page
  already calls this hook, so there's no separate route-listener component to keep in sync.
- `src/lib/analytics.ts`'s `trackEvent()` is wired into `GeneratorShell`'s copy/download buttons
  (`code_copied`/`code_downloaded`) — since all 48+ tools share that one component, this covers
  every generator from a single call site. Add further events here the same way; `window.gtag?.()`
  optionally-chains, so calls are always safe even when analytics is off or blocked.
- The bootstrap script also no-ops whenever `?_prerender=1` is present in the URL — the prerender
  crawl (`scripts/prerender.ts`) appends this to every route it visits so refreshing static
  snapshots locally can never send real pageviews for bot/crawl traffic. Verified: with the param,
  `window.dataLayer`/`window.gtag` stay `undefined` through the whole crawl.
- **The GA4 bootstrap block is baked into the crawled snapshot at whatever build time the last
  local `npm run prerender` ran** — same class of problem as the JS/CSS asset-hash drift `Build
  time per deployment` section above solves for, and solved the same way:
  `scripts/copy-prerendered.mjs` resyncs the entire `GA4_BOOTSTRAP_START`/`_END` block (not just
  the script/link tags) from the fresh `dist/index.html` into every snapshot on every
  `npm run build`. Without this, a live deploy would permanently ship whatever measurement ID (or
  lack of one) happened to be set on the developer's machine during their last local crawl,
  completely disconnected from Vercel's actual configured env var — verified by prerendering with
  one fake ID, then building with a different one, and confirming the deployed output used the
  build's ID, not the stale crawled one.

## Commands

```
npm run dev          # vite dev server
npm run build        # tsc -b && vite build && overlay prerendered/ onto dist/ — what Vercel runs
npm run lint          # eslint
npm run sitemap       # regenerate public/sitemap.xml from scripts/routes.ts
npm run prerender      # vite build + crawl every route with Playwright into prerendered/ — LOCAL ONLY, never run on Vercel
npm run refresh-seo   # sitemap + prerender together — run this locally before pushing a change that should show up to crawlers
```
