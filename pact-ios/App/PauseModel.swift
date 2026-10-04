import Foundation

enum PauseEntry: Equatable {
    case shortcut, preview
}

enum PausePhase: Equatable {
    case deciding, resolved, quiet
}

@MainActor
final class PauseModel: ObservableObject {
    static let shared = PauseModel()

    @Published var presented = false
    @Published var phase: PausePhase = .deciding
    @Published var source: PauseEntry = .preview
    @Published var window = PauseWindow()
    @Published var friendNote: String?

    private let store: PauseWindowStore

    var blocksDismissal: Bool { source == .shortcut && phase == .deciding }

    private init(store: PauseWindowStore = .live) {
        self.store = store
        window = store.load()
    }

    func reload() {
        let latest = store.load()
        if latest != window { window = latest }
    }

    func handle(_ url: URL) {
        guard url.scheme?.lowercased() == "pact", url.host?.lowercased() == "pause" else { return }
        requestPresentation(source: .shortcut)
    }

    func preview() {
        requestPresentation(source: .preview)
    }

    func requestPresentation(source: PauseEntry) {
        reload()
        self.source = source
        if source == .preview || window.shouldInterrupt(at: Date()) {
            phase = .deciding
            if let asked = window.friendAskedAt, Date().timeIntervalSince(asked) < PauseWindow.passDuration {
                friendNote = PauseOutcome.friendAsked.confirmation
            } else {
                friendNote = nil
            }
        } else {
            friendNote = nil
            phase = .quiet
        }
        presented = true
    }

    func resolve(_ outcome: PauseOutcome) {
        window = store.load().resolving(outcome, at: Date())
        store.save(window)
        friendNote = nil
        phase = .resolved
    }

    func noteFriendAsked() {
        window = store.load().resolving(.friendAsked, at: Date())
        store.save(window)
        friendNote = PauseOutcome.friendAsked.confirmation
    }

    func updateFriendHandle(_ handle: String) {
        var current = store.load()
        guard current.friendHandle != handle else { return }
        current.friendHandle = handle
        store.save(current)
        window = current
    }

    func endQuietPeriod() {
        var current = store.load()
        current.passUntil = nil
        store.save(current)
        window = current
        if phase == .quiet { phase = .deciding }
    }

    func dismiss() {
        presented = false
    }
}
