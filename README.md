# Moshly design tokens

One source of truth for the Moshly look, on every platform.

```
tokens/neo-brut/*.tokens.json   ← edit here (W3C Design Tokens format)
        │  npm run build
        ├─► dist/neo-brut.css                               web: CSS custom properties
        ├─► themes/neo-brut.css (imports the above)         web apps: Tailwind CSS v4 theme
        └─► ios/Sources/MoshlyNeoBrut/*.swift               iOS: Swift package (SwiftUI)
```

Generated files are committed, so consumers never need to build. CI (`npm run check`) fails if they are out of date.

## Neo Brut

The Moshly skin: black `#181818`, lime `#D8FF54`, purple `#C575F8`, white — Inter Tight, with Caveat Brush as a one-word accent.

| Mode | Look | Apply (web) |
|---|---|---|
| Dark (default) | Flat, heavily rounded colour blocks, hairline borders, no offset shadows | `<html class="skin-brutal">` |
| Light | Cream paper, black ink borders, hard offset shadows, small radius | `<html class="skin-brutal theme-light">` |

These are the same classes the Moshly hub (dashboard + launcher) uses, so a user's choice carries over.

### Design rules

1. **60-30-10** — neutrals carry the page. **Lime** is only for primary actions and "you are here". **Purple** is identity (plan, avatar, the user's name).
2. **Affordance** — only interactive things look like pills/buttons. Section labels are type (uppercase, 800, tracked), never chips.
3. **Emphasise data, not containers** — quiet boxes, loud numbers.
4. **Radius follows padding** (inner radius ≈ outer − padding).
5. **Targets ≥ 40px** (44px on touch).
6. Text on lime / purple / red fills is always `on` (`#111111`).

## Use it

### Plain CSS (any site)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/emptytown/moshly-design-tokens@main/dist/neo-brut.css">
```

```css
.card { background: var(--nb-card); border: var(--nb-border-width) solid var(--nb-line);
        border-radius: var(--nb-radius-block); box-shadow: var(--nb-shadow-md); }
```

Naming: `nb.color.<name>` → `--nb-<name>`; everything else → `--nb-<group>-<name>` (e.g. `--nb-radius-control`, `--nb-shadow-md`, `--nb-font-size-label`).

### Tailwind CSS v4 (web apps)

```css
@import "@moshly/apps-tokens/themes/neo-brut";
```

Every existing utility follows the skin (`bg-primary` is lime, `bg-secondary` purple, `rounded-lg` the mode radius). Extras: `bg-nb-*`, `shadow-nb-sm|nb|nb-lg`, `rounded-nb`, `rounded-nb-block`, `border-nb`, `font-display`, `font-script`, and components `.nb-card`, `.nb-label`, `.nb-btn`, `.nb-btn-primary`, `.nb-script`.

### iOS (SwiftUI)

Xcode → File → Add Package Dependencies… → `https://github.com/emptytown/moshly-design-tokens`, product **MoshlyNeoBrut**.

```swift
import MoshlyNeoBrut

ContentView().neoBrut()        // follows the system appearance: dark ↔ light

struct AppsCard: View {
    @Environment(\.neoBrut) private var nb
    var body: some View {
        VStack(alignment: .leading, spacing: NeoBrut.Space.sm) {
            Text("My apps").nbLabel()
            Text("Permanent apps in your plan").foregroundStyle(nb.muted.color)
            Button("Use app") {}.buttonStyle(.nbPrimary)
        }
        .nbCard()
    }
}
```

Values: `NeoBrut.Palette.lime`, `NeoBrut.Space.md`, `NeoBrut.Typography.Size.title`, per mode `NeoBrut.dark.card` / `NeoBrut.light.shadowMd` (or `@Environment(\.neoBrut)`). Bundle the Inter Tight and Caveat Brush fonts (SIL OFL) in the app; without them SwiftUI falls back to the system font.

## Change a token

1. Edit `tokens/neo-brut/core.tokens.json` (shared) or `mode.dark` / `mode.light` (both modes must define the same tokens — the build fails otherwise).
2. `npm run build`
3. Commit the JSON **and** the generated files.

## Other themes

`themes/base.css`, `forms.css`, `projects.css`, `street.css` and the colour `skins/` are hand-written Tailwind themes for the apps; they predate the JSON pipeline.
