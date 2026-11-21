// swift-tools-version:5.9
// Swift Package for the Moshly design tokens (iOS). Add it in Xcode:
//   File → Add Package Dependencies… → https://github.com/emptytown/moshly-design-tokens
// then `import MoshlyNeoBrut`.
import PackageDescription

let package = Package(
    name: "MoshlyDesignTokens",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [
        .library(name: "MoshlyNeoBrut", targets: ["MoshlyNeoBrut"]),
    ],
    targets: [
        .target(name: "MoshlyNeoBrut", path: "ios/Sources/MoshlyNeoBrut"),
    ]
)
