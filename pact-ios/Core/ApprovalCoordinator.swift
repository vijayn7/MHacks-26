import Foundation

// Used by the host, shield action and active broadcast. Network waits happen
// outside the cross-process file lock; state is validated again on return.
struct ApprovalCoordinator: Sendable {
    let store: InterventionStore
    let transport: any FriendApprovalTransport

    func sync() async throws {
        guard let request = try store.read().activePause?.approval,
              request.status == .pending else { return }
        guard Date() < request.expiresAt else { throw FriendApprovalError.expired }
        if request.submittedAt == nil {
            try await transport.submit(request)
            try store.update { try $0.markApprovalSubmitted(request, at: Date()) }
        }
        let reply = try await transport.status(for: request)
        try store.update { try $0.applyApprovalReply(reply, at: Date()) }
    }
}

// Adapter for the team's existing /check-in API. Native requests carry only
// identifiers and times; the backend supplies the opted-in friend.
struct HTTPFriendApprovalTransport: FriendApprovalTransport {
    let isConfigured = true
    let baseURL: URL
    let accessToken: String
    let session: URLSession

    init(baseURL: URL, accessToken: String, session: URLSession = .shared, allowLocalHTTP: Bool = false) throws {
        let host = baseURL.host?.lowercased() ?? ""
        let parts = host.split(separator: ".").compactMap { Int($0) }
        let privateIPv4 = parts.count == 4 && parts.allSatisfy { (0...255).contains($0) } &&
            (parts[0] == 10 || parts[0] == 127 || (parts[0] == 192 && parts[1] == 168) || (parts[0] == 172 && (16...31).contains(parts[1])))
        let local = host == "localhost" || host.hasSuffix(".local") || privateIPv4
        guard !host.isEmpty, baseURL.user == nil, baseURL.password == nil,
              baseURL.query == nil, baseURL.fragment == nil, accessToken.count >= 32,
              baseURL.scheme == "https" || (allowLocalHTTP && local && baseURL.scheme == "http") else {
            throw ApprovalHTTPError.invalidConfiguration
        }
        self.baseURL = baseURL; self.accessToken = accessToken; self.session = session
    }

    private struct Receipt: Decodable {
        let id: UUID
        let pauseId: UUID
        let source: String
        let status: String
    }
    struct Health: Decodable { let nativeApprovalVersion: Int; let messagingReady: Bool; let durableStorage: Bool }

    func health() async throws -> Health {
        let health = try JSONDecoder().decode(Health.self, from: await send(makeRequest(path: "native/health")))
        guard health.nativeApprovalVersion == 1 else { throw ApprovalHTTPError.incompatibleBackend }
        return health
    }

    func submit(_ approval: FriendApprovalRequest) async throws {
        struct Payload: Encodable {
            let id: UUID; let pauseId: UUID; let source = "ios"
            let createdAt: Date; let expiresAt: Date
        }
        var request = makeRequest(path: "check-in")
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .millisecondsSince1970
        request.httpBody = try encoder.encode(Payload(id: approval.id, pauseId: approval.pauseID,
                                                     createdAt: approval.createdAt, expiresAt: approval.expiresAt))
        _ = try decode(await send(request), for: approval)
    }

    func status(for approval: FriendApprovalRequest) async throws -> FriendApprovalReply {
        var request = makeRequest(path: "check-in")
        var url = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!
        url.queryItems = [URLQueryItem(name: "source", value: "ios"), URLQueryItem(name: "id", value: approval.id.uuidString)]
        request.url = url.url
        return try decode(await send(request), for: approval)
    }

    private func decode(_ data: Data, for approval: FriendApprovalRequest) throws -> FriendApprovalReply {
        let receipt = try JSONDecoder().decode(Receipt.self, from: data)
        guard receipt.source == "ios", receipt.id == approval.id, receipt.pauseId == approval.pauseID else {
            throw FriendApprovalError.mismatchedRequest
        }
        let status: FriendApprovalRequest.Status
        switch receipt.status {
        case "sent": status = .pending
        case "approved": status = .approved
        case "rejected": status = .denied
        default: throw ApprovalHTTPError.serverRejected
        }
        return FriendApprovalReply(requestID: receipt.id, pauseID: receipt.pauseId, status: status)
    }

    private func makeRequest(path: String) -> URLRequest {
        var request = URLRequest(url: baseURL.appendingPathComponent(path), cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 12)
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else { throw ApprovalHTTPError.serverRejected }
        switch response.statusCode {
        case 200...299: return data
        case 401: throw ApprovalHTTPError.unauthorized
        case 404: throw ApprovalHTTPError.incompatibleBackend
        case 410: throw FriendApprovalError.expired
        case 502: throw ApprovalHTTPError.messageNotSent
        case 503: throw ApprovalHTTPError.unavailable
        default: throw ApprovalHTTPError.serverRejected
        }
    }
}

enum ApprovalHTTPError: LocalizedError {
    case invalidConfiguration, serverRejected, unauthorized, incompatibleBackend, messageNotSent, unavailable
    var errorDescription: String? {
        switch self {
        case .invalidConfiguration: "Enter the backend URL and Pact pairing key. Use HTTPS, or a local Mac address for a Debug build."
        case .serverRejected: "The approval service could not complete the request. Your app stays paused."
        case .unauthorized: "The pairing key was rejected. Copy PACT_IOS_TOKEN from the backend's local .env file."
        case .incompatibleBackend: "This backend has no matching native request. Run the updated API and create a new pause."
        case .messageNotSent: "Photon could not confirm sending this prompt. Check the server and friend's opt-in, then start a new pause. No approval was granted."
        case .unavailable: "The backend is still sending or Photon is unavailable. The app stays paused; try checking again."
        }
    }
}

extension HTTPFriendApprovalTransport: PauseScoreTransport {
    func recordScoreEvent(_ event: PauseEvent) async throws -> ScoreReceipt {
        struct Payload: Encodable {
            let id: String
            let pauseId: UUID
            let type: String
            let ruleId: String
            let source = "ios"
            let at: Date
        }
        var request = makeRequest(path: "pause-events")
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
        // The server assigns the configured demo price. No price OCR is added.
        request.httpBody = try encoder.encode(Payload(id: event.id, pauseId: event.pauseID,
            type: event.kind.rawValue, ruleId: event.ruleID, at: event.at))
        return try JSONDecoder().decode(ScoreReceipt.self, from: await send(request))
    }
    func scoreSummary() async throws -> ScoreSummary {
        var request = makeRequest(path: "score")
        var url = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!
        url.queryItems = [URLQueryItem(name: "source", value: "ios")]
        request.url = url.url
        return try JSONDecoder().decode(ScoreSummary.self, from: await send(request))
    }
}
