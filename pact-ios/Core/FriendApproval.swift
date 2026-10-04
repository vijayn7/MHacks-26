import Foundation

// The backend owns friend identity, message delivery and reply verification.
// The iPhone only receives the authenticated status of this exact request.
struct FriendApprovalRequest: Codable, Equatable, Identifiable, Sendable {
    enum Status: String, Codable, Sendable { case pending, approved, denied }
    let id: UUID
    let pauseID: UUID
    let createdAt: Date
    let expiresAt: Date
    var submittedAt: Date?
    var status: Status = .pending

    init(pauseID: UUID, at now: Date) {
        id = UUID(); self.pauseID = pauseID; createdAt = now
        expiresAt = now.addingTimeInterval(15 * 60)
    }
}

struct FriendApprovalReply: Codable, Equatable, Sendable {
    let requestID: UUID
    let pauseID: UUID
    let status: FriendApprovalRequest.Status
}

protocol FriendApprovalTransport: Sendable {
    var isConfigured: Bool { get }
    // An idempotent submit: retries with this request ID must not text twice.
    // Returning successfully means the backend accepted the request, not that
    // the friend received or approved a message.
    func submit(_ request: FriendApprovalRequest) async throws
    func status(for request: FriendApprovalRequest) async throws -> FriendApprovalReply
}

struct UnconfiguredFriendApprovalTransport: FriendApprovalTransport {
    let isConfigured = false
    func submit(_ request: FriendApprovalRequest) async throws { throw FriendApprovalError.backendUnavailable }
    func status(for request: FriendApprovalRequest) async throws -> FriendApprovalReply { throw FriendApprovalError.backendUnavailable }
}

enum FriendApprovalError: LocalizedError {
    case backendUnavailable, expired, mismatchedRequest, alreadyAnswered, approvalRequired, notSubmitted

    var errorDescription: String? {
        switch self {
        case .backendUnavailable: "Photon messaging is not connected yet. No text was sent. You can still choose Drop or Save, or turn off blocking."
        case .expired: "This request expired. The app stays blocked. Choose Drop or Save, or turn off blocking."
        case .mismatchedRequest: "This reply does not match the current request. The app stays blocked."
        case .alreadyAnswered: "This request already has a different answer."
        case .approvalRequired: "A confirmed friend reply is required to continue."
        case .notSubmitted: "This request has not been accepted by the messaging backend."
        }
    }
}
