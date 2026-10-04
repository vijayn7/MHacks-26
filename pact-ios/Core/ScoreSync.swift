import Foundation

struct ScoreSummary: Decodable, Sendable {
    let userId: String
    let score: Int
    let demoAmountCents: Int
}
struct ScoreReceipt: Decodable, Sendable {
    let eventId: String
    let score: Int
    let delta: Int
    let amountCents: Int
}
protocol PauseScoreTransport: Sendable {
    func recordScoreEvent(_ event: PauseEvent) async throws -> ScoreReceipt
    func scoreSummary() async throws -> ScoreSummary
}
struct ScoreSyncCoordinator: Sendable {
    let store: InterventionStore
    let transport: any PauseScoreTransport
    func sync() async throws {
        // Bounded work per pass; failed requests remain queued for the next pass.
        // UI-history deletion cannot erase unsent choices.
        for event in try store.read().pendingScoreEvents.prefix(50) {
            let receipt = try await transport.recordScoreEvent(event)
            guard receipt.eventId == event.id else { throw ScoreSyncError.mismatchedReceipt }
            try store.update { $0.acknowledgeScoreEvent(event.id) }
        }
    }
}
enum ScoreSyncError: LocalizedError {
    case mismatchedReceipt
    var errorDescription: String? { "The score update was not acknowledged. It remains queued for retry." }
}
