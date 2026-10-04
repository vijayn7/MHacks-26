import XCTest
@testable import PactCore

final class InterventionTests: XCTestCase {
    private let start = Date(timeIntervalSince1970: 1000)
    private let session = UUID()

    private func configured() -> InterventionState {
        var state = InterventionState()
        state.enabled = true
        state.applicationTokenData = Data("opaque test token".utf8)
        return state
    }

    private func observe(_ state: inout InterventionState, _ stage: ShoppingStage = .checkout, confirmed: Bool = true,
                         number: Int = 1) -> CheckoutPause? {
        state.observe(stage: stage, confirmedCandidate: confirmed, signals: [.checkoutHeading, .payment],
                      sessionID: session, candidateNumber: number, at: start)
    }

    private func confirm(_ state: inout InterventionState, at now: Date) throws {
        let request = try XCTUnwrap(state.activePause?.approval)
        try state.markApprovalSubmitted(request, at: now)
        try state.applyApprovalReply(.init(requestID: request.id, pauseID: request.pauseID, status: .approved), at: now)
    }

    func testRequiresOptInSelectionAndConfirmedCandidate() {
        var state = InterventionState()
        XCTAssertNil(observe(&state))
        state.enabled = true
        XCTAssertNil(observe(&state))
        state.applicationTokenData = Data()
        XCTAssertNil(observe(&state, confirmed: false))
        XCTAssertNotNil(observe(&state))
        XCTAssertEqual(state.pauses.count, 1)
    }

    func testDetectorRulesStillNeedTwoObservationsBeforeShielding() {
        var state = configured()
        var stabilizer = CheckoutStabilizer()
        let analysis = CheckoutAnalyzer().analyze(lines: ["Checkout", "Payment method"])
        for index in 0...3 {
            let at = start.addingTimeInterval(Double(index))
            let pause = state.observe(stage: analysis.stage, confirmedCandidate: stabilizer.observe(analysis.stage, at: at),
                                      signals: analysis.signals, sessionID: session, candidateNumber: 1, at: at)
            XCTAssertEqual(pause != nil, index == 1)
        }
        XCTAssertEqual(state.pauses.count, 1)
    }

    func testHoldStartsWhenShownAndOpeningAgainCannotResetIt() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        XCTAssertNil(pause.endsAt)
        XCTAssertFalse(pause.canContinue(at: start.addingTimeInterval(1000)))
        let shownAt = start.addingTimeInterval(100)
        let opened = try state.open(pause.id, at: shownAt)
        let repeatOpen = try state.open(pause.id, at: shownAt.addingTimeInterval(8))
        XCTAssertEqual(opened.endsAt, shownAt.addingTimeInterval(15))
        XCTAssertEqual(opened, repeatOpen)
        XCTAssertEqual(state.events.filter { $0.kind == .pauseOpened }.count, 1)
    }

    func testContinueRejectsEarlyTapAndRequestsApprovalAtDeadline() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        XCTAssertThrowsError(try state.resolve(pause.id, decision: .continued, at: start))
        _ = try state.open(pause.id, at: start)
        XCTAssertThrowsError(try state.resolve(pause.id, decision: .continued, at: start.addingTimeInterval(14.999)))
        XCTAssertNotNil(state.blockedPause)
        try state.resolve(pause.id, decision: .continued, at: start.addingTimeInterval(15))
        XCTAssertNotNil(state.blockedPause)
        XCTAssertNil(state.pauses[0].decision)
        XCTAssertNotNil(state.blockedPause?.approval)
        try confirm(&state, at: start.addingTimeInterval(16))
        XCTAssertNil(state.blockedPause)
        XCTAssertEqual(state.pauses[0].decision, .continued)
    }

    func testElapsedTimeAloneNeverUnlocksOrRecordsAChoice() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        _ = try state.open(pause.id, at: start)
        XCTAssertTrue(state.blockedPause!.canContinue(at: start.addingTimeInterval(1000)))
        XCTAssertNil(state.blockedPause!.decision)
        XCTAssertNil(state.blockedPause!.releasedAt)
    }

    func testDropAndSaveKeepAppBlockedUntilExplicitResume() throws {
        for decision in [CheckoutDecision.dropped, .saved] {
            var state = configured()
            let pause = try XCTUnwrap(observe(&state))
            try state.resolve(pause.id, decision: decision, at: start)
            XCTAssertEqual(state.blockedPause?.decision, decision)
            XCTAssertNil(state.activePause)
            XCTAssertEqual(state.savedPauses.count, decision == .saved ? 1 : 0)
            state.releaseBlock(at: start.addingTimeInterval(1))
            XCTAssertNil(state.blockedPause)
        }
    }

    func testRetryIsIdempotentAndCannotChangeAnExistingDecision() throws {
        for decision in CheckoutDecision.allCases {
            var state = configured()
            let pause = try state.startDemo(at: start)
            _ = try state.open(pause.id, at: start)
            try state.resolve(pause.id, decision: decision, at: start.addingTimeInterval(15))
            if decision == .continued { try confirm(&state, at: start.addingTimeInterval(16)) }
            let previous = state
            try state.resolve(pause.id, decision: decision, at: start.addingTimeInterval(20))
            XCTAssertEqual(state, previous)
            let other: CheckoutDecision = decision == .dropped ? .saved : .dropped
            XCTAssertThrowsError(try state.resolve(pause.id, decision: other, at: start.addingTimeInterval(30)))
        }
    }

    func testPactAndUnreadableFramesDoNotRearmSameCheckout() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        _ = try state.open(pause.id, at: start)
        try state.resolve(pause.id, decision: .continued, at: start.addingTimeInterval(15))
        try confirm(&state, at: start.addingTimeInterval(16))
        for stage in [ShoppingStage.ownApp, .unknown, .checkout, .checkout] {
            XCTAssertNil(observe(&state, stage, number: 2))
        }
        XCTAssertEqual(state.pauses.count, 1)
        _ = observe(&state, .cart)
        _ = observe(&state, .cart)
        XCTAssertNotNil(observe(&state, number: 3))
    }

    func testSingleNoisyCartReadingDoesNotRearm() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        _ = try state.open(pause.id, at: start)
        try state.resolve(pause.id, decision: .continued, at: start.addingTimeInterval(15))
        try confirm(&state, at: start.addingTimeInterval(16))
        _ = observe(&state, .cart)
        _ = observe(&state, .unknown)
        _ = observe(&state, .cart)
        XCTAssertNil(observe(&state, number: 2))
    }

    func testResolvedButBlockedPauseCannotBeReplacedByAnotherCandidate() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        try state.resolve(pause.id, decision: .saved, at: start)
        _ = observe(&state, .cart); _ = observe(&state, .cart)
        XCTAssertNil(observe(&state, number: 2))
        XCTAssertEqual(state.blockedPauseID, pause.id)
    }

    func testStopReleasesWithoutInventingAPurchaseDecision() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        state.releaseBlock(at: start)
        XCTAssertNil(state.blockedPause)
        XCTAssertNil(state.activePause)
        XCTAssertNil(state.pauses[0].decision)
        XCTAssertThrowsError(try state.resolve(pause.id, decision: .continued, at: start.addingTimeInterval(100)))
        let previous = state
        state.releaseBlock(at: start)
        XCTAssertEqual(previous, state)
    }

    func testClearingHistoryKeepsOutstandingBlockAndConfiguration() throws {
        var state = configured()
        let pause = try state.startDemo(at: start)
        try state.resolve(pause.id, decision: .saved, at: start)
        state.clearCompletedHistory()
        XCTAssertEqual(state.blockedPauseID, pause.id)
        XCTAssertEqual(state.pauses.count, 1)
        XCTAssertNotNil(state.applicationTokenData)
        state.releaseBlock(at: start)
        state.clearCompletedHistory()
        XCTAssertTrue(state.pauses.isEmpty)
        XCTAssertTrue(state.events.isEmpty)
    }

    func testHistoryIsBoundedAndEventsHaveUniqueStableIDs() throws {
        var state = configured()
        for _ in 0..<120 {
            let pause = try state.startDemo(at: start)
            _ = try state.open(pause.id, at: start)
            try state.resolve(pause.id, decision: .saved, at: start)
            state.releaseBlock(at: start)
        }
        XCTAssertEqual(state.pauses.count, 100)
        XCTAssertEqual(state.events.count, 400)
        XCTAssertEqual(Set(state.events.map(\.id)).count, state.events.count)
        XCTAssertTrue(state.events.allSatisfy { event in state.pauses.contains { $0.id == event.pauseID } })
    }

    func testRoundTripPreservesDeadlineAndDuplicateSuppression() throws {
        var state = configured()
        let pause = try XCTUnwrap(observe(&state))
        _ = try state.open(pause.id, at: start)
        var restored = try JSONDecoder().decode(InterventionState.self, from: JSONEncoder().encode(state))
        XCTAssertEqual(restored, state)
        XCTAssertEqual(restored.blockedPause?.secondsRemaining(at: start.addingTimeInterval(9)), 6)
        XCTAssertNil(observe(&restored, number: 2))
    }
}

final class InterventionStoreTests: XCTestCase {
    private func makeStore() throws -> InterventionStore {
        try InterventionStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
    }

    func testIndependentReadersSharePersistedTimerAndChoice() throws {
        let first = try makeStore()
        defer { try? FileManager.default.removeItem(at: first.directory) }
        let second = try InterventionStore(directory: first.directory)
        let time = Date(timeIntervalSince1970: 1000)
        let pause = try first.update { state in
            state.enabled = true; state.applicationTokenData = Data()
            let pause = try state.startDemo(at: time)
            return try state.open(pause.id, at: time)
        }
        XCTAssertEqual(try second.read().activePause?.endsAt, pause.endsAt)
        try second.update { try $0.resolve(pause.id, decision: .saved, at: time) }
        XCTAssertEqual(try first.read().savedPauses.count, 1)
        XCTAssertEqual(try first.read().blockedPauseID, pause.id)
    }

    func testFailedTransactionDoesNotSavePartialChangesOrKeepLock() throws {
        let store = try makeStore()
        defer { try? FileManager.default.removeItem(at: store.directory) }
        XCTAssertThrowsError(try store.update { state in state.enabled = true; throw PauseError.unavailable })
        XCTAssertFalse(try store.read().enabled)
        try store.update { $0.enabled = true }
        XCTAssertTrue(try store.read().enabled)
    }

    func testCorruptDataIsReportedInsteadOfResettingTheBlock() throws {
        let store = try makeStore()
        defer { try? FileManager.default.removeItem(at: store.directory) }
        try Data("broken".utf8).write(to: store.directory.appendingPathComponent("interventions.json"))
        XCTAssertThrowsError(try store.read())
    }

    func testConcurrentWritersDoNotLoseChoices() throws {
        let store = try makeStore()
        defer { try? FileManager.default.removeItem(at: store.directory) }
        try store.update { $0.enabled = true; $0.applicationTokenData = Data() }
        let errors = ErrorCollector()
        DispatchQueue.concurrentPerform(iterations: 30) { _ in
            do {
                try store.update {
                    let pause = try $0.startDemo(at: Date())
                    try $0.resolve(pause.id, decision: .saved, at: Date())
                    $0.releaseBlock(at: Date())
                }
            } catch { errors.add(error) }
        }
        XCTAssertTrue(errors.values.isEmpty)
        let state = try store.read()
        XCTAssertEqual(state.savedPauses.count, 30)
        XCTAssertEqual(state.events.count, 90)
    }
}

private final class ErrorCollector: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [Error] = []
    func add(_ error: Error) { lock.lock(); defer { lock.unlock() }; storage.append(error) }
    var values: [Error] { lock.lock(); defer { lock.unlock() }; return storage }
}
