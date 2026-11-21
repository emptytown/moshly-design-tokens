// SwiftUI layer for the generated Neo Brut tokens (hand-written — the values live in
// NeoBrutTokens.generated.swift, built from tokens/neo-brut/*.tokens.json).
//
// Quick start:
//
//     import MoshlyNeoBrut
//
//     ContentView()
//         .neoBrut()                     // picks NeoBrut.dark / .light from the system colour scheme
//
//     struct Card: View {
//         @Environment(\.neoBrut) private var nb
//         var body: some View {
//             VStack(alignment: .leading, spacing: NeoBrut.Space.sm) {
//                 Text("My apps").nbLabel()
//                 Button("Use app") {}.buttonStyle(.nbPrimary)
//             }
//             .nbCard()
//         }
//     }
//
// Fonts: bundle Inter Tight and Caveat Brush (SIL OFL) in the app and list them under
// UIAppFonts. If they are missing, SwiftUI falls back to the system font.

#if canImport(SwiftUI)
import SwiftUI

// MARK: - Colours & fonts

public extension NBColor {
    /// The colour as a SwiftUI `Color` (sRGB).
    var color: Color { Color(.sRGB, red: red, green: green, blue: blue, opacity: alpha) }
}

public extension NeoBrut {
    /// Inter Tight at a token size and weight (e.g. `NeoBrut.font(size: NeoBrut.Typography.Size.title, weight: NeoBrut.Typography.Weight.display)`).
    static func font(size: Double, weight: Int = Typography.Weight.body, relativeTo style: Font.TextStyle = .body) -> Font {
        Font.custom(Typography.Family.base[0], size: size, relativeTo: style).weight(fontWeight(weight))
    }

    /// The script accent (Caveat Brush) — one word at most.
    static func scriptFont(size: Double) -> Font {
        Font.custom(Typography.Family.script[0], size: size)
    }

    /// Maps a CSS numeric weight to SwiftUI.
    static func fontWeight(_ value: Int) -> Font.Weight {
        switch value {
        case ..<150: return .ultraLight
        case ..<250: return .thin
        case ..<350: return .light
        case ..<450: return .regular
        case ..<550: return .medium
        case ..<650: return .semibold
        case ..<750: return .bold
        case ..<850: return .heavy
        default: return .black
        }
    }

    /// Dark is the default skin; light follows the system light appearance.
    static func mode(for scheme: ColorScheme) -> NeoBrutMode { scheme == .light ? light : dark }
}

// MARK: - Environment

private struct NeoBrutModeKey: EnvironmentKey {
    static let defaultValue: NeoBrutMode = NeoBrut.dark
}

public extension EnvironmentValues {
    /// The active Neo Brut mode. Set it with `.neoBrut()`.
    var neoBrut: NeoBrutMode {
        get { self[NeoBrutModeKey.self] }
        set { self[NeoBrutModeKey.self] = newValue }
    }
}

private struct NeoBrutRoot: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    let forced: NeoBrutMode?

    func body(content: Content) -> some View {
        let mode = forced ?? NeoBrut.mode(for: scheme)
        content
            .environment(\.neoBrut, mode)
            .tint(NeoBrut.Palette.lime.color)
            .background(mode.paper.color.ignoresSafeArea())
            .foregroundStyle(mode.ink.color)
            .font(NeoBrut.font(size: NeoBrut.Typography.Size.body))
    }
}

// MARK: - Modifiers

public extension View {
    /// Apply Neo Brut to a view tree. Pass a mode to force dark or light; by default it follows the system.
    func neoBrut(_ mode: NeoBrutMode? = nil) -> some View { modifier(NeoBrutRoot(forced: mode)) }

    /// A token shadow. Hard (blur 0) in light mode, none in dark mode.
    func nbShadow(_ shadow: NBShadow) -> some View {
        self.shadow(color: shadow.color.color, radius: shadow.blur / 2, x: shadow.x, y: shadow.y)
    }

    /// Raised surface: card colour, block radius, mode border and medium shadow.
    func nbCard(padding: Double = NeoBrut.Space.lg) -> some View { modifier(NBCard(padding: padding)) }
}

private struct NBCard: ViewModifier {
    @Environment(\.neoBrut) private var nb
    let padding: Double

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: nb.radiusBlock, style: .continuous)
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(nb.card.color, in: shape)
            .overlay(shape.strokeBorder(nb.line.color, lineWidth: nb.borderWidth))
            .nbShadow(nb.shadowMd)
    }
}

public extension Text {
    /// Section label: type, not a chip (uppercase, label size/weight/tracking).
    func nbLabel() -> some View {
        self.font(NeoBrut.font(size: NeoBrut.Typography.Size.label, weight: NeoBrut.Typography.Weight.label, relativeTo: .caption))
            .tracking(NeoBrut.Typography.Size.label * NeoBrut.Typography.Tracking.label)
            .textCase(.uppercase)
    }
}

// MARK: - Buttons

/// Primary action: lime fill, black text. Use for the one thing you want tapped.
public struct NBPrimaryButtonStyle: ButtonStyle {
    public init() {}
    public func makeBody(configuration: Configuration) -> some View { NBButton(configuration: configuration, primary: true) }
}

/// Secondary action: outline in the mode's line colour.
public struct NBSecondaryButtonStyle: ButtonStyle {
    public init() {}
    public func makeBody(configuration: Configuration) -> some View { NBButton(configuration: configuration, primary: false) }
}

public extension ButtonStyle where Self == NBPrimaryButtonStyle {
    static var nbPrimary: NBPrimaryButtonStyle { NBPrimaryButtonStyle() }
}

public extension ButtonStyle where Self == NBSecondaryButtonStyle {
    static var nbSecondary: NBSecondaryButtonStyle { NBSecondaryButtonStyle() }
}

private struct NBButton: View {
    @Environment(\.neoBrut) private var nb
    @Environment(\.isEnabled) private var isEnabled
    let configuration: ButtonStyleConfiguration
    let primary: Bool

    var body: some View {
        // Dark mode uses pills; light mode uses the small control radius.
        let radius = nb == NeoBrut.dark ? NeoBrut.Radius.pill : nb.radiusControl
        let shape = RoundedRectangle(cornerRadius: min(radius, NeoBrut.Size.targetTouch / 2), style: .continuous)
        let pressed = configuration.isPressed
        let fill = primary ? NeoBrut.Palette.lime.color : Color.clear
        let text = primary ? NeoBrut.Palette.on.color : nb.ink.color
        let border = primary && nb == NeoBrut.dark ? Color.clear : nb.lineStrong.color
        let shadow = pressed ? NeoBrut.dark.shadowSm : nb.shadowSm

        configuration.label
            .font(NeoBrut.font(size: 15, weight: NeoBrut.Typography.Weight.label))
            .foregroundStyle(isEnabled ? text : nb.muted.color)
            .padding(.horizontal, NeoBrut.Space.lg)
            .frame(minHeight: NeoBrut.Size.targetTouch)
            .background(isEnabled ? fill : Color.clear, in: shape)
            .overlay(shape.strokeBorder(border, lineWidth: nb.borderWidth))
            .nbShadow(shadow)
            // Light: press "into" the shadow. Dark: subtle scale.
            .offset(x: pressed && nb == NeoBrut.light ? nb.shadowSm.x : 0, y: pressed && nb == NeoBrut.light ? nb.shadowSm.y : 0)
            .scaleEffect(pressed && nb == NeoBrut.dark ? 0.97 : 1)
            .animation(.easeOut(duration: 0.08), value: pressed)
            .contentShape(shape)
    }
}
#endif
