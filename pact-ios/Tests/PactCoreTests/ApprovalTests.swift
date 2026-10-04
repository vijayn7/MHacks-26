import XCTest
@testable import PactCore

final class ApprovalTests: XCTestCase, @unchecked Sendable {
    private let now = Date()

    private func pending() throws -> InterventionState {
        var state = InterventionState()
        state.enabled = true; state.applicationTokenData = Data()
        let pause = try state.startDemo(at: now.addingTimeInterval(-20))
        _ = try state.open(pause.id, at: now.addingTimeInterval(-20))
        try state.resolve(pause.id, decision: .continued, at: now)
        return state
    }

    private func reply(_ state: InterventionState, _ status: FriendApprovalRequest.Status = .approved) throws -> FriendApprovalReply {
        let request = try XCTUnwrap(state.activePause?.approval)
        return FriendApprovalReply(requestID: request.id, pauseID: request.pauseID, status: status)
    }

    func testContinueCreatesOneRequestWithoutUnlocking() throws {
        var state = try pending()
        let before = state
        try state.resolve(state.activePause!.id, decision: .continued, at: now.addingTimeInterval(4))
        XCTAssertEqual(state, before)
        XCTAssertNotNil(state.blockedPause)
        XCTAssertNil(state.activePause?.decision)
        XCTAssertFalse(state.activePause!.canContinue(at: now.addingTimeInterval(999)))
        XCTAssertFalse(state.events.contains { $0.kind == .blockReleased })
    }

    func testNoApprovalBeforeBackendAcceptsRequest() throws {
        var state = try pending()
        let response = try reply(state)
        XCTAssertThrowsError(try state.applyApprovalReply(response, at: now))
        XCTAssertNotNil(state.blockedPause)
    }

    func testWrongPauseOrRequestCannotUnlock() throws {
        var state = try pending()
        let request = state.activePause!.approval!
        try state.markApprovalSubmitted(request, at: now)
        for response in [FriendApprovalReply(requestID: UUID(), pauseID: request.pauseID, status: .approved),
                         FriendApprovalReply(requestID: request.id, pauseID: UUID(), status: .approved)] {
            XCTAssertThrowsError(try state.applyApprovalReply(response, at: now))
            XCTAssertEqual(state.blockedPauseID, request.pauseID)
        }
    }

    func testPendingDeniedAndExpiredRequestsStayBlocked() throws {
        for status in [FriendApprovalRequest.Status.pending, .denied, .approved] {
            var state = try pending()
            let request = state.activePause!.approval!
            try state.markApprovalSubmitted(request, at: now)
            let response = try reply(state, status)
            if status == .approved {
                XCTAssertThrowsError(try state.applyApprovalReply(response, at: request.expiresAt))
            } else {
                try state.applyApprovalReply(response, at: now)
            }
            XCTAssertNotNil(state.blockedPause)
            XCTAssertNil(state.activePause?.decision)
        }
    }

    func testDropSaveAndStopInvalidatePendingConfirmation() throws {
        for decision in [CheckoutDecision.dropped, .saved, nil] {
            var state = try pending()
            try state.markApprovalSubmitted(state.activePause!.approval!, at: now)
            let response = try reply(state)
            if let decision { try state.resolve(state.activePause!.id, decision: decision, at: now) }
            else { state.releaseBlock(at: now) }
            let before = state
            XCTAssertThrowsError(try state.applyApprovalReply(response, at: now))
            XCTAssertEqual(state, before)
        }
    }

    func testConfirmedReplyReleasesOnlyItsOwnBlockAndIsIdempotent() throws {
        var state = try pending()
        try state.markApprovalSubmitted(state.activePause!.approval!, at: now)
        let response = try reply(state)
        try state.applyApprovalReply(response, at: now)
        XCTAssertNil(state.blockedPause)
        XCTAssertEqual(state.pauses.last?.decision, .continued)
        let another = try state.startDemo(at: now)
        let before = state
        try state.applyApprovalReply(response, at: now)
        XCTAssertEqual(state, before)
        XCTAssertEqual(state.blockedPauseID, another.id)
    }

    func testDeniedRequestCannotBeChangedToApproved() throws {
        var state = try pending()
        try state.markApprovalSubmitted(state.activePause!.approval!, at: now)
        try state.applyApprovalReply(reply(state, .denied), at: now)
        XCTAssertThrowsError(try state.applyApprovalReply(reply(state), at: now))
        XCTAssertNotNil(state.blockedPause)
    }

    func testApprovalPersistsAndLegacyStateStillLoads() throws {
        let state = try pending()
        let data = try JSONEncoder().encode(state)
        let restored = try JSONDecoder().decode(InterventionState.self, from: data)
        XCTAssertEqual(restored, state)
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        var pauses = try XCTUnwrap(object["pauses"] as? [[String: Any]])
        pauses[0].removeValue(forKey: "approval")
        object["pauses"] = pauses
        let legacy = try JSONDecoder().decode(InterventionState.self, from: JSONSerialization.data(withJSONObject: object))
        XCTAssertNotNil(legacy.blockedPause)
        XCTAssertNil(legacy.blockedPause?.approval)
    }

    func testUnconfiguredBackendNeverMarksSentOrUnlocks() async throws {
        let store = try InterventionStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.directory) }
        let state = try pending()
        try store.update { $0 = state }
        do {
            try await ApprovalCoordinator(store: store, transport: UnconfiguredFriendApprovalTransport()).sync()
            XCTFail("Unconfigured backend must fail")
        } catch {}
        XCTAssertEqual(try store.read(), state)
    }

    func testCoordinatorAppliesBackendReplyAcrossSharedStore() async throws {
        let store = try InterventionStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.directory) }
        let state = try pending()
        try store.update { $0 = state }
        let transport = StubTransport(response: try reply(state))
        try await ApprovalCoordinator(store: store, transport: transport).sync()
        let otherProcess = try InterventionStore(directory: store.directory)
        let result = try otherProcess.read()
        XCTAssertNil(result.blockedPause)
        XCTAssertEqual(result.pauses.last?.decision, .continued)
        XCTAssertEqual(result.events.filter { $0.kind == .friendRequestAccepted }.count, 1)
    }

    func testNetworkResponseAfterDropCannotUnlock() async throws {
        let store = try InterventionStore(directory: FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString))
        defer { try? FileManager.default.removeItem(at: store.directory) }
        let state = try pending()
        try store.update { $0 = state }
        let transport = StubTransport(response: try reply(state), dropWhileChecking: store)
        do {
            try await ApprovalCoordinator(store: store, transport: transport).sync()
            XCTFail("Late confirmation must be rejected")
        } catch {}
        XCTAssertEqual(try store.read().blockedPause?.decision, .dropped)
    }
}

private struct StubTransport: FriendApprovalTransport {
    let isConfigured = true
    let response: FriendApprovalReply
    var dropWhileChecking: InterventionStore?
    func submit(_ request: FriendApprovalRequest) async throws {}
    func status(for request: FriendApprovalRequest) async throws -> FriendApprovalReply {
        if let store = dropWhileChecking {
            try store.update { try $0.resolve(request.pauseID, decision: .dropped, at: Date()) }
        }
        return response
    }
}
