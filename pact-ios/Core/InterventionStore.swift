import Foundation
import Darwin

// The app and ReplayKit extension are different processes. A short file lock
// surrounds every read/modify/write so a capture update cannot overwrite
// the shopper's decision. Files contain fixed metadata, never recognized text.
struct InterventionStore: Sendable {
    let directory: URL

    init(directory: URL) throws {
        self.directory = directory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    func read() throws -> InterventionState { try locked { try load() } }

    @discardableResult
    func update<T>(_ change: (inout InterventionState) throws -> T) throws -> T {
        try locked {
            var state = try load()
            let previous = state
            let result = try change(&state)
            if state != previous {
                let data = try JSONEncoder().encode(state)
                try data.write(to: directory.appendingPathComponent("interventions.json"), options: [.atomic, .completeFileProtection])
            }
            return result
        }
    }

    private func load() throws -> InterventionState {
        let file = directory.appendingPathComponent("interventions.json")
        guard FileManager.default.fileExists(atPath: file.path) else { return InterventionState() }
        let state = try JSONDecoder().decode(InterventionState.self, from: Data(contentsOf: file))
        guard state.version == 1 else { throw CocoaError(.fileReadCorruptFile) }
        return state
    }

    private func locked<T>(_ action: () throws -> T) throws -> T {
        let fd = Darwin.open(directory.appendingPathComponent("interventions.lock").path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard fd >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
        defer { Darwin.close(fd) }
        guard flock(fd, LOCK_EX) == 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
        defer { flock(fd, LOCK_UN) }
        return try action()
    }
}
