import AppIntents

struct ShouldInterruptIntent: AppIntent {
    static var title: LocalizedStringResource = "Should Interrupt"
    static var description = IntentDescription("True when Pact's 15-minute quiet period is over. This action stays in the background and does not open Pact.")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ReturnsValue<Bool> {
        let interrupt = PauseWindowStore.live.load().shouldInterrupt(at: Date())
        return .result(value: interrupt)
    }
}

struct OpenPauseIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Pause"
    static var description = IntentDescription("Opens Pact's pause card. Use it inside If, only when Should Interrupt is true.")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        await PauseModel.shared.requestPresentation(source: .shortcut)
        return .result()
    }
}

struct PactAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ShouldInterruptIntent(),
            phrases: ["Check if \(.applicationName) should interrupt"],
            shortTitle: "Should Interrupt",
            systemImageName: "pause.fill"
        )
        AppShortcut(
            intent: OpenPauseIntent(),
            phrases: ["Open \(.applicationName) pause"],
            shortTitle: "Open Pause",
            systemImageName: "hand.raised.fill"
        )
    }
}
