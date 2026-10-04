// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PactCore",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [.library(name: "PactCore", targets: ["PactCore"])],
    targets: [
        .target(name: "PactCore", path: "Core"),
        .testTarget(name: "PactCoreTests", dependencies: ["PactCore"], path: "Tests/PactCoreTests")
    ]
)
