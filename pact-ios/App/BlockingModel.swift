import SwiftUI
import FamilyControls
import ManagedSettings
import Combine

@MainActor
final class BlockingModel: ObservableObject {
    @Published private(set) var state = InterventionState()
    @Published private(set) var authorized = false
    @Published private(set) var busy = false
    @Published private(set) var error: String?
    @Published var backendURL = ""
    @Published var pairingKey = ""
    @Published private(set) var checkingBackend = false
    @Published private(set) var connectionStatus: String?
    @Published var selection = FamilyActivitySelection()
    @Published var choosingApp = false
    @Published var showingPause = false
    @Published private(set) var now = Date()
    private var store: InterventionStore?
    private var approvalTransport: any FriendApprovalTransport
    private var lastApprovalCheck = Date.distantPast
    var messagingConnected: Bool { approvalTransport.isConfigured }

    init(approvalTransport: any FriendApprovalTransport = ApprovalBackend.makeTransport()) {
        self.approvalTransport = approvalTransport
        if let settings = ApprovalBackend.settings() { backendURL = settings.url; pairingKey = settings.pairingKey }
        do { store = try CheckoutBlocker.sharedStore() }
        catch { self.error = "The shared App Group is unavailable. Check signing for all four targets." }
        refresh()
    }

    func connectBackend() async {
        guard !checkingBackend, state.blockedPause == nil else { return }
        checkingBackend = true; connectionStatus = nil
        defer { checkingBackend = false }
        do {
            let settings = ApprovalBackendSettings(url: backendURL.trimmingCharacters(in: .whitespacesAndNewlines),
                                                   pairingKey: pairingKey.trimmingCharacters(in: .whitespacesAndNewlines))
            let transport = try ApprovalBackend.transport(for: settings)
            let health = try await transport.health() // Read-only; never sends a text.
            try ApprovalBackend.save(settings)
            approvalTransport = transport
            connectionStatus = health.messagingReady ? "Connected. Photon is ready; no text was sent." : "Connected, but Photon is not ready. Check the API server."
            if !health.durableStorage { connectionStatus! += " Server history is temporary until Neon is configured." }
        } catch { connectionStatus = error.localizedDescription }
    }

    func refresh() {
        now = Date()
        authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        guard let store else { return }
        do {
            // Revoked authorization must not silently re-enable an old rule.
            if AuthorizationCenter.shared.authorizationStatus == .denied {
                try CheckoutBlocker.release(store, disable: true)
            }
            let latest = try store.read()
            if authorized, latest != state { try CheckoutBlocker.reconcile(store) }
            state = latest
            if let data = state.applicationTokenData, let token = try? JSONDecoder().decode(ApplicationToken.self, from: data), !choosingApp {
                selection = FamilyActivitySelection()
                selection.applicationTokens = [token]
            }
            if state.activePause == nil { showingPause = false }
        } catch { self.error = "Couldn't read the pause. Tap Turn off blocking to release the selected app." }
    }

    func authorize() async {
        guard !busy else { return }
        busy = true; error = nil
        defer { busy = false }
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            refresh()
            if authorized { choosingApp = true }
        } catch { self.error = "Screen Time access wasn't granted. Check the Family Controls capability and signing, then try again." }
    }

    func saveSelection() {
        guard let store else { return }
        guard selection.applicationTokens.count == 1, selection.categoryTokens.isEmpty, selection.webDomainTokens.isEmpty,
              let token = selection.applicationTokens.first else {
            error = "Select exactly one shopping app. Leave categories and websites unselected for this prototype."
            return
        }
        do {
            let data = try JSONEncoder().encode(token)
            try CheckoutBlocker.release(store, disable: true)
            try store.update { $0.applicationTokenData = data }
            choosingApp = false; error = nil; refresh()
        } catch { self.error = "Couldn't save the selected app. Try again." }
    }

    func enable() {
        guard let store, authorized, state.applicationTokenData != nil else {
            error = "Allow Screen Time access and select one shopping app first."; return
        }
        do {
            try store.update { $0.enabled = true }
            error = nil; refresh()
        } catch { self.error = "Couldn't enable checkout blocking." }
    }

    // An explicit exit also works when a shared file is unreadable. It clears
    // only Pact's named store; it never changes the user's other Screen Time rules.
    func disable() {
        do {
            if let store { try CheckoutBlocker.release(store, disable: true) }
            error = nil
        } catch { self.error = "The shield was cleared, but settings could not be saved. Stop monitoring before testing again." }
        CheckoutBlocker.settings.clearAllSettings()
        showingPause = false
        refresh()
    }

    func testBlock() {
        guard let store, authorized else { error = "Allow Screen Time access first."; return }
        do {
            _ = try store.update { try $0.startDemo(at: Date()) }
            try CheckoutBlocker.reconcile(store)
            error = nil; refresh()
        } catch { self.error = error.localizedDescription }
    }

    func openPause() {
        guard let store, let pause = state.activePause else { return }
        do {
            _ = try store.update { try $0.open(pause.id, at: Date()) }
            error = nil; refresh(); showingPause = true
        } catch { self.error = error.localizedDescription }
    }

    func decide(_ decision: CheckoutDecision) {
        guard let store, let pause = state.activePause else { return }
        do {
            try store.update { try $0.resolve(pause.id, decision: decision, at: Date()) }
            try CheckoutBlocker.reconcile(store)
            error = nil; showingPause = decision == .continued; refresh()
            if decision == .continued { Task { await syncFriendApproval() } }
        } catch { self.error = error.localizedDescription }
    }

    func syncFriendApproval() async {
        guard !busy, authorized, let store else { return }
        busy = true; error = nil; lastApprovalCheck = Date()
        defer { busy = false; refresh() }
        do { try await ApprovalBackend.sync(store, transport: approvalTransport) }
        catch { self.error = error.localizedDescription }
    }

    // Invoked while Pact is foreground. An active broadcast also checks the
    // backend so a reply can release the shield while the other app is open.
    func pollFriendReplyIfNeeded() async {
        guard messagingConnected, let approval = state.activePause?.approval,
              approval.status == .pending, Date() < approval.expiresAt,
              Date().timeIntervalSince(lastApprovalCheck) >= 5 else { return }
        await syncFriendApproval()
    }

    func resumeApp() {
        guard let store else { return }
        guard state.blockedPause?.decision != nil else { error = FriendApprovalError.approvalRequired.localizedDescription; return }
        do { try CheckoutBlocker.release(store); error = nil; refresh() }
        catch { self.error = "Couldn't release the pause. Tap Turn off blocking." }
    }

    func clearHistory() {
        guard let store else { return }
        do { try store.update { $0.clearCompletedHistory() }; error = nil; refresh() }
        catch { self.error = "Couldn't clear completed choices." }
    }
}
