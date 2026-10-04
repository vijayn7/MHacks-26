import XCTest
@testable import PactCore

final class ScoreSyncTests: XCTestCase, @unchecked Sendable {
    func testOutboxSurvivesHistoryClearAndLegacyFilesDecode() throws {
        var state = InterventionState()
        state.enabled = true; state.applicationTokenData = Data()
        let pause = try state.startDemo(at: Date())
        try state.resolve(pause.id, decision: .dropped, at: Date())
        state.releaseBlock(at: Date())
        let pending = state.pendingScoreEvents
        state.clearCompletedHistory()
        XCTAssertTrue(state.events.isEmpty)
        XCTAssertEqual(state.pendingScoreEvents, pending)
        let data = try JSONEncoder().encode(state)
        XCTAssertEqual(try JSONDecoder().decode(InterventionState.self, from: data).pendingScoreEvents, pending)
        var legacy = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        legacy.removeValue(forKey: "scoreOutbox")
        XCTAssertTrue(try JSONDecoder().decode(InterventionState.self, from: JSONSerialization.data(withJSONObject: legacy)).pendingScoreEvents.isEmpty)
    }
    func testFailureRetainsOutboxAndRetryAcknowledgesOnlySentEvents() async throws {
        let store = try InterventionStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.directory) }
        try store.update { state in
            state.enabled = true; state.applicationTokenData = Data()
            let pause = try state.startDemo(at: Date())
            try state.resolve(pause.id, decision: .saved, at: Date())
        }
        let original = try store.read().pendingScoreEvents
        do {
            try await ScoreSyncCoordinator(store: store, transport: ScoreStub(fails: true)).sync()
            XCTFail("Offline sync must fail")
        } catch {}
        XCTAssertEqual(try store.read().pendingScoreEvents, original)
        try await ScoreSyncCoordinator(store: store, transport: ScoreStub(fails: false)).sync()
        XCTAssertTrue(try store.read().pendingScoreEvents.isEmpty)
        XCTAssertEqual(try store.read().events, original)
    }
    func testMismatchedReceiptDoesNotDiscardAnEvent() async throws {
        let store = try InterventionStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.directory) }
        try store.update { state in
            state.enabled = true; state.applicationTokenData = Data()
            _ = try state.startDemo(at: Date())
        }
        do {
            try await ScoreSyncCoordinator(store: store, transport: ScoreStub(fails: false, mismatched: true)).sync()
            XCTFail("Mismatched receipts must fail")
        } catch {}
        XCTAssertEqual(try store.read().pendingScoreEvents.count, 1)
    }
    func testRepeatedChoiceQueuesOneAwardEvent() throws {
        var state = InterventionState()
        state.enabled = true; state.applicationTokenData = Data()
        let pause = try state.startDemo(at: Date())
        try state.resolve(pause.id, decision: .saved, at: Date())
        try state.resolve(pause.id, decision: .saved, at: Date())
        XCTAssertEqual(state.pendingScoreEvents.filter { $0.kind == .savedForLater }.count, 1)
    }
}
private struct ScoreStub: PauseScoreTransport {
    let fails: Bool
    var mismatched = false
    func recordScoreEvent(_ event: PauseEvent) async throws -> ScoreReceipt {
        if fails { throw URLError(.notConnectedToInternet) }
        return ScoreReceipt(eventId: mismatched ? "wrong" : event.id, score: 16, delta: 16, amountCents: 6499)
    }
    func scoreSummary() async throws -> ScoreSummary { ScoreSummary(userId: "demo", score: 16, demoAmountCents: 6499) }
}
