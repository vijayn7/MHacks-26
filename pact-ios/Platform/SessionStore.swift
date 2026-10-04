import Foundation

enum PactConfiguration {
    static var appGroup: String {
        Bundle.main.object(forInfoDictionaryKey: "PactAppGroup") as? String ?? "group.dev.pact.monitor"
    }
    static var broadcastBundleID: String {
        Bundle.main.object(forInfoDictionaryKey: "PactBroadcastBundleID") as? String ?? "dev.pact.monitor.Broadcast"
    }
}

struct HostPresence: Codable {
    var isVisible: Bool
    var updatedAt: Date
}

struct SessionStore {
    enum StoreError: LocalizedError {
        case missingAppGroup
        var errorDescription: String? {
            "The shared App Group is unavailable. Configure the same App Group and signing team on both Xcode targets."
        }
    }

    let directory: URL

    init() throws {
        guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: PactConfiguration.appGroup) else {
            throw StoreError.missingAppGroup
        }
        directory = container.appendingPathComponent("PactSession", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var url = directory
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try url.setResourceValues(values)
    }

    func save(_ snapshot: MonitoringSnapshot) throws { try write(snapshot, to: "snapshot.json") }
    func read() throws -> MonitoringSnapshot? {
        let file = directory.appendingPathComponent("snapshot.json")
        guard FileManager.default.fileExists(atPath: file.path) else { return nil }
        return try JSONDecoder().decode(MonitoringSnapshot.self, from: Data(contentsOf: file))
    }

    func setHostVisible(_ visible: Bool) throws {
        try write(HostPresence(isVisible: visible, updatedAt: Date()), to: "presence.json")
    }

    func hostIsVisible(at now: Date) -> Bool {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent("presence.json")),
              let presence = try? JSONDecoder().decode(HostPresence.self, from: data) else { return false }
        return presence.isVisible && now.timeIntervalSince(presence.updatedAt) < 4
    }

    // A stop request is tied to a session, so a stale request cannot end a new one.
    func requestStop(sessionID: UUID) throws { try write(sessionID, to: "stop.json") }
    func stopRequested(for sessionID: UUID) -> Bool {
        guard let data = try? Data(contentsOf: directory.appendingPathComponent("stop.json")),
              let id = try? JSONDecoder().decode(UUID.self, from: data) else { return false }
        return id == sessionID
    }

    private func write<T: Encodable>(_ object: T, to name: String) throws {
        let data = try JSONEncoder().encode(object)
        try data.write(to: directory.appendingPathComponent(name), options: [.atomic, .completeFileProtection])
    }
}
