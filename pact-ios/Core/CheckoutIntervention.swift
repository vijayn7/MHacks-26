import Foundation

enum CheckoutDecision: String, Codable, Sendable, CaseIterable {
    case dropped, saved, continued

    var title: String {
        switch self {
        case .dropped: "Chose to drop"
        case .saved: "Saved for later"
        case .continued: "Chose to continue"
        }
    }
}

struct CheckoutPause: Codable, Equatable, Identifiable, Sendable {
    enum Source: String, Codable, Sendable { case live, demo }

    static let demoDuration: TimeInterval = 15
    let id: UUID
    let source: Source
    let detectedAt: Date
    let signals: [ScreenSignal]
    let sessionID: UUID?
    let candidateNumber: Int?
    var openedAt: Date?
    var endsAt: Date?
    var decision: CheckoutDecision?
    var resolvedAt: Date?
    var releasedAt: Date?
    var approval: FriendApprovalRequest?

    func secondsRemaining(at now: Date) -> Int {
        guard let endsAt else { return Int(Self.demoDuration) }
        return max(0, Int(ceil(endsAt.timeIntervalSince(now))))
    }
    func canContinue(at now: Date) -> Bool {
        decision == nil && releasedAt == nil && approval == nil && endsAt.map { now >= $0 } == true
    }
}

struct PauseEvent: Codable, Equatable, Identifiable, Sendable {
    enum Kind: String, Codable, Sendable {
        case pauseStarted = "pause_started", pauseOpened = "pause_opened"
        case dropSelected = "drop_selected", savedForLater = "saved_for_later", continueSelected = "continue_selected"
        case blockReleased = "block_released"
        case friendRequestAccepted = "friend_request_accepted", friendApproved = "friend_approved", friendDenied = "friend_denied"
    }
    let id: String
    let pauseID: UUID
    let kind: Kind
    let at: Date
    let ruleID: String

    init(pauseID: UUID, kind: Kind, at: Date) {
        self.id = "\(pauseID.uuidString):\(kind.rawValue)"
        self.pauseID = pauseID; self.kind = kind; self.at = at
        self.ruleID = "existing-checkout-signals-v1"
    }
}

// Pure state transitions: no UI, OCR, networking or notification dependencies.
// Choices are intentions, never a claim that another app's cart was changed.
struct InterventionState: Codable, Equatable, Sendable {
    var version = 1
    var enabled = false
    // Screen Time's opaque app token. No bundle ID, merchant or page content.
    var applicationTokenData: Data?
    private(set) var blockedPauseID: UUID?
    private(set) var pauses: [CheckoutPause] = []
    private(set) var events: [PauseEvent] = []
    private var gateSessionID: UUID?
    private var checkoutArmed = true
    private var nonCheckoutObservations = 0

    var activePause: CheckoutPause? { pauses.last { $0.decision == nil && $0.releasedAt == nil } }
    var blockedPause: CheckoutPause? { pauses.first { $0.id == blockedPauseID } }
    var savedPauses: [CheckoutPause] { pauses.filter { $0.decision == .saved }.reversed() }

    // Called after the unchanged CheckoutStabilizer. Ignore Pact itself and
    // unreadable frames when deciding whether the shopper left a checkout.
    mutating func observe(stage: ShoppingStage, confirmedCandidate: Bool, signals: [ScreenSignal],
                          sessionID: UUID, candidateNumber: Int, at now: Date) -> CheckoutPause? {
        guard enabled, applicationTokenData != nil else { return nil }
        if gateSessionID != sessionID {
            gateSessionID = sessionID; checkoutArmed = true; nonCheckoutObservations = 0
        }
        if [.browsing, .cart, .confirmation].contains(stage) {
            nonCheckoutObservations = min(2, nonCheckoutObservations + 1)
            if nonCheckoutObservations == 2 { checkoutArmed = true }
        } else { nonCheckoutObservations = 0 }
        guard stage == .checkout, confirmedCandidate, checkoutArmed, blockedPause == nil else { return nil }
        checkoutArmed = false
        return create(source: .live, signals: signals, sessionID: sessionID, candidateNumber: candidateNumber, at: now)
    }

    mutating func startDemo(at now: Date) throws -> CheckoutPause {
        guard enabled, applicationTokenData != nil else { throw PauseError.notConfigured }
        if let blockedPause { return blockedPause }
        return create(source: .demo, signals: [.checkoutHeading, .orderSummary, .payment, .purchaseAction], at: now)
    }

    private mutating func create(source: CheckoutPause.Source, signals: [ScreenSignal], sessionID: UUID? = nil,
                                 candidateNumber: Int? = nil, at now: Date) -> CheckoutPause {
        let pause = CheckoutPause(id: UUID(), source: source, detectedAt: now, signals: signals,
                                  sessionID: sessionID, candidateNumber: candidateNumber)
        pauses.append(pause)
        blockedPauseID = pause.id
        events.append(PauseEvent(pauseID: pause.id, kind: .pauseStarted, at: now))
        // Bounded, on-device history; always retain the new active pause.
        pauses = Array(pauses.suffix(100))
        let retained = Set(pauses.map(\.id))
        events.removeAll { !retained.contains($0.pauseID) }
        return pause
    }

    mutating func open(_ id: UUID, at now: Date) throws -> CheckoutPause {
        guard let index = pauses.firstIndex(where: { $0.id == id && $0.decision == nil && $0.releasedAt == nil }) else { throw PauseError.unavailable }
        if pauses[index].openedAt == nil {
            pauses[index].openedAt = now
            pauses[index].endsAt = now.addingTimeInterval(CheckoutPause.demoDuration)
            events.append(PauseEvent(pauseID: id, kind: .pauseOpened, at: now))
        }
        return pauses[index]
    }

    @discardableResult
    mutating func resolve(_ id: UUID, decision: CheckoutDecision, at now: Date) throws -> CheckoutPause {
        guard let index = pauses.firstIndex(where: { $0.id == id }) else { throw PauseError.unavailable }
        if let previous = pauses[index].decision {
            guard previous == decision else { throw PauseError.alreadyResolved }
            return pauses[index]
        }
        guard pauses[index].releasedAt == nil else { throw PauseError.unavailable }
        if decision == .continued {
            // Continue is an explicit request for friend approval. It never
            // grants access on its own, including when invoked by the shield.
            if pauses[index].approval != nil { return pauses[index] }
            guard pauses[index].canContinue(at: now) else { throw PauseError.stillHolding }
            pauses[index].approval = FriendApprovalRequest(pauseID: id, at: now)
            events.append(PauseEvent(pauseID: id, kind: .continueSelected, at: now))
            return pauses[index]
        }
        pauses[index].decision = decision
        pauses[index].resolvedAt = now
        let kind: PauseEvent.Kind = switch decision {
        case .dropped: .dropSelected
        case .saved: .savedForLater
        case .continued: .continueSelected
        }
        events.append(PauseEvent(pauseID: id, kind: kind, at: now))
        return pauses[index]
    }

    mutating func markApprovalSubmitted(_ request: FriendApprovalRequest, at now: Date) throws {
        let index = try approvalIndex(requestID: request.id, pauseID: request.pauseID)
        guard blockedPauseID == request.pauseID, pauses[index].decision == nil,
              pauses[index].releasedAt == nil else { throw PauseError.unavailable }
        guard let approval = pauses[index].approval, now < approval.expiresAt else { throw FriendApprovalError.expired }
        if approval.submittedAt != nil { return }
        pauses[index].approval?.submittedAt = now
        events.append(PauseEvent(pauseID: request.pauseID, kind: .friendRequestAccepted, at: now))
    }

    // Responses must come from our authenticated backend, which validates the
    // linked friend and Photon conversation. Raw messages/deep links are not approvals.
    mutating func applyApprovalReply(_ reply: FriendApprovalReply, at now: Date) throws {
        let index = try approvalIndex(requestID: reply.requestID, pauseID: reply.pauseID)
        guard let approval = pauses[index].approval else { throw FriendApprovalError.mismatchedRequest }
        if approval.status != .pending {
            guard approval.status == reply.status else { throw FriendApprovalError.alreadyAnswered }
            return // An old duplicate cannot release a newer block.
        }
        guard blockedPauseID == reply.pauseID, pauses[index].decision == nil,
              pauses[index].releasedAt == nil else { throw PauseError.unavailable }
        guard now < approval.expiresAt else { throw FriendApprovalError.expired }
        guard approval.submittedAt != nil else { throw FriendApprovalError.notSubmitted }
        guard reply.status != .pending else { return }
        pauses[index].approval?.status = reply.status
        let approved = reply.status == .approved
        events.append(PauseEvent(pauseID: reply.pauseID, kind: approved ? .friendApproved : .friendDenied, at: now))
        if approved {
            pauses[index].decision = .continued
            pauses[index].resolvedAt = now
            releaseBlock(at: now)
        }
    }

    private func approvalIndex(requestID: UUID, pauseID: UUID) throws -> Int {
        guard let index = pauses.firstIndex(where: {
            $0.id == pauseID && $0.approval?.id == requestID && $0.approval?.pauseID == pauseID
        }) else { throw FriendApprovalError.mismatchedRequest }
        return index
    }

    mutating func releaseBlock(at now: Date) {
        if let id = blockedPauseID, let index = pauses.firstIndex(where: { $0.id == id }) {
            pauses[index].releasedAt = now
            events.append(PauseEvent(pauseID: id, kind: .blockReleased, at: now))
        }
        blockedPauseID = nil
    }

    mutating func clearCompletedHistory() {
        pauses.removeAll { $0.id != blockedPauseID && ($0.decision != nil || $0.releasedAt != nil) }
        let remaining = Set(pauses.map(\.id))
        events.removeAll { !remaining.contains($0.pauseID) }
    }
}

enum PauseError: LocalizedError {
    case unavailable, stillHolding, alreadyResolved, notConfigured
    var errorDescription: String? {
        switch self {
        case .unavailable: "This pause is no longer available. Refresh and try again."
        case .stillHolding: "Your pause is still running. Take a moment before continuing."
        case .alreadyResolved: "A different choice has already been recorded for this pause."
        case .notConfigured: "Authorize Screen Time, choose one shopping app and enable checkout blocking first."
        }
    }
}
