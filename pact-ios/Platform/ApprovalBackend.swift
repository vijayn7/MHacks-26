import Foundation

struct ApprovalBackendSettings: Codable {
    var url: String
    var pairingKey: String
}

enum ApprovalBackend {
    private static func settingsURL() throws -> URL {
        try SessionStore().directory.appendingPathComponent("approval-backend.json")
    }
    static func settings() -> ApprovalBackendSettings? {
        guard let url = try? settingsURL(), let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(ApprovalBackendSettings.self, from: data)
    }
    static func transport(for settings: ApprovalBackendSettings) throws -> HTTPFriendApprovalTransport {
        guard let url = URL(string: settings.url) else { throw ApprovalHTTPError.invalidConfiguration }
        #if DEBUG
        let allowLocalHTTP = true
        #else
        let allowLocalHTTP = false
        #endif
        return try HTTPFriendApprovalTransport(baseURL: url, accessToken: settings.pairingKey, allowLocalHTTP: allowLocalHTTP)
    }
    static func save(_ settings: ApprovalBackendSettings) throws {
        _ = try transport(for: settings)
        // App Group shared by host, shield and broadcast. File protection keeps
        // the demo pairing key inaccessible while locked; never a Photon secret.
        try JSONEncoder().encode(settings).write(to: settingsURL(), options: [.atomic, .completeFileProtection])
    }
    static func makeTransport() -> any FriendApprovalTransport {
        guard let settings = settings(), let transport = try? transport(for: settings) else {
            return UnconfiguredFriendApprovalTransport()
        }
        return transport
    }
    static func syncScores(_ store: InterventionStore) async throws {
        guard let transport = makeTransport() as? any PauseScoreTransport else { return }
        try await ScoreSyncCoordinator(store: store, transport: transport).sync()
    }
    static func sync(_ store: InterventionStore, transport: any FriendApprovalTransport) async throws {
        // Scoring never controls shielding. A scoring outage must not prevent a
        // verified friend reply from releasing the app.
        async let scoreSync: Void? = try? syncScores(store)
        var approvalError: Error?
        do {
            try await ApprovalCoordinator(store: store, transport: transport).sync()
            try CheckoutBlocker.reconcile(store)
        } catch { approvalError = error }
        _ = await scoreSync
        if let approvalError { throw approvalError }
    }
}
