import XCTest
@testable import PactCore

final class ApprovalHTTPTests: XCTestCase, @unchecked Sendable {
    func testCheckInContractContainsOnlyMetadataAndUsesPairingKey() async throws {
        let request = FriendApprovalRequest(pauseID: UUID(), at: Date())
        let session = makeSession()
        defer { session.invalidateAndCancel(); ApprovalURLProtocol.handler = nil }
        ApprovalURLProtocol.handler = { incoming in
            XCTAssertEqual(incoming.value(forHTTPHeaderField: "Authorization"), "Bearer test-pact-pairing-key-at-least-32-characters")
            XCTAssertEqual(incoming.cachePolicy, .reloadIgnoringLocalCacheData)
            if incoming.httpMethod == "POST" {
                XCTAssertEqual(incoming.url?.path, "/check-in")
                let stream = try XCTUnwrap(incoming.httpBodyStream)
                stream.open(); defer { stream.close() }
                var bytes = [UInt8](repeating: 0, count: 4096)
                let count = stream.read(&bytes, maxLength: bytes.count)
                XCTAssertGreaterThan(count, 0)
                let payload = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(bytes.prefix(max(0, count)))) as? [String: Any])
                XCTAssertEqual(Set(payload.keys), ["id", "pauseId", "source", "createdAt", "expiresAt"])
                XCTAssertEqual(payload["id"] as? String, request.id.uuidString)
            } else {
                XCTAssertEqual(incoming.httpMethod, "GET")
                XCTAssertEqual(incoming.url?.path, "/check-in")
                let query = URLComponents(url: incoming.url!, resolvingAgainstBaseURL: false)?.queryItems
                XCTAssertEqual(query?.first(where: { $0.name == "source" })?.value, "ios")
                XCTAssertEqual(query?.first(where: { $0.name == "id" })?.value, request.id.uuidString)
            }
            return (200, try JSONSerialization.data(withJSONObject: ["id": request.id.uuidString, "pauseId": request.pauseID.uuidString, "source": "ios", "status": "approved"]))
        }
        let transport = try HTTPFriendApprovalTransport(baseURL: URL(string: "https://pact.test")!, accessToken: "test-pact-pairing-key-at-least-32-characters", session: session)
        try await transport.submit(request)
        let reply = try await transport.status(for: request)
        XCTAssertEqual(reply.status, .approved)
    }

    func testHTTPFailureAndMismatchedReceiptsCannotBecomeApproval() async throws {
        let request = FriendApprovalRequest(pauseID: UUID(), at: Date())
        let session = makeSession()
        defer { session.invalidateAndCancel(); ApprovalURLProtocol.handler = nil }
        let transport = try HTTPFriendApprovalTransport(baseURL: URL(string: "https://pact.test")!, accessToken: "test-pact-pairing-key-at-least-32-characters", session: session)
        for status in [500, 200] {
            ApprovalURLProtocol.handler = { _ in
                (status, try JSONSerialization.data(withJSONObject: ["id": UUID().uuidString, "pauseId": request.pauseID.uuidString, "source": "ios", "status": "approved"]))
            }
            do { try await transport.submit(request); XCTFail("Invalid receipt must fail") } catch {}
            do { _ = try await transport.status(for: request); XCTFail("Invalid status must fail") } catch {}
        }
    }

    func testTransportRejectsMissingAuthenticationAndCleartextEndpoints() {
        XCTAssertThrowsError(try HTTPFriendApprovalTransport(baseURL: URL(string: "http://pact.test")!, accessToken: "token"))
        XCTAssertThrowsError(try HTTPFriendApprovalTransport(baseURL: URL(string: "https://pact.test")!, accessToken: ""))
    }

    func testUnknownStatusAndWebReceiptsNeverApproveNativePause() async throws {
        let request = FriendApprovalRequest(pauseID: UUID(), at: Date())
        let session = makeSession()
        defer { session.invalidateAndCancel(); ApprovalURLProtocol.handler = nil }
        let transport = try HTTPFriendApprovalTransport(baseURL: URL(string: "https://pact.test")!, accessToken: String(repeating: "a", count: 32), session: session)
        for status in ["sending", "send_failed", "expired", "unknown"] {
            ApprovalURLProtocol.handler = { _ in (200, try JSONSerialization.data(withJSONObject: [
                "id": request.id.uuidString, "pauseId": request.pauseID.uuidString, "source": "ios", "status": status])) }
            do { _ = try await transport.status(for: request); XCTFail("Unconfirmed state must fail") } catch {}
        }
        ApprovalURLProtocol.handler = { _ in (200, try JSONSerialization.data(withJSONObject: [
            "id": request.id.uuidString, "status": "approved", "reply": "YES"])) }
        do { _ = try await transport.status(for: request); XCTFail("Browser receipt must fail") } catch {}
    }

    func testSentStaysPendingAndRejectionMapsToDenied() async throws {
        let request = FriendApprovalRequest(pauseID: UUID(), at: Date())
        let session = makeSession()
        defer { session.invalidateAndCancel(); ApprovalURLProtocol.handler = nil }
        let transport = try HTTPFriendApprovalTransport(baseURL: URL(string: "https://pact.test")!, accessToken: String(repeating: "a", count: 32), session: session)
        for (wire, expected) in [("sent", FriendApprovalRequest.Status.pending), ("rejected", .denied)] {
            ApprovalURLProtocol.handler = { _ in (200, try JSONSerialization.data(withJSONObject: [
                "id": request.id.uuidString, "pauseId": request.pauseID.uuidString, "source": "ios", "status": wire])) }
            let reply = try await transport.status(for: request)
            XCTAssertEqual(reply.status, expected)
        }
    }

    func testCleartextIsRestrictedToExplicitLocalDebugOptIn() throws {
        let key = String(repeating: "a", count: 32)
        for address in ["localhost", "demo.local", "192.168.1.5", "10.0.0.5", "172.16.0.5"] {
            let url = URL(string: "http://\(address):8787")!
            XCTAssertThrowsError(try HTTPFriendApprovalTransport(baseURL: url, accessToken: key))
            XCTAssertNoThrow(try HTTPFriendApprovalTransport(baseURL: url, accessToken: key, allowLocalHTTP: true))
        }
        for address in ["pact.test", "8.8.8.8", "172.32.0.5", "localhost.evil.test"] {
            XCTAssertThrowsError(try HTTPFriendApprovalTransport(baseURL: URL(string: "http://\(address)")!, accessToken: key, allowLocalHTTP: true))
        }
    }

    func testScoreEventWireContractHasNoScreenContentOrClientChosenUserOrPrice() async throws {
        let event = PauseEvent(pauseID: UUID(), kind: .dropSelected, at: Date())
        let session = makeSession()
        defer { session.invalidateAndCancel(); ApprovalURLProtocol.handler = nil }
        ApprovalURLProtocol.handler = { incoming in
            XCTAssertEqual(incoming.url?.path, "/pause-events")
            XCTAssertEqual(incoming.httpMethod, "POST")
            XCTAssertNotNil(incoming.value(forHTTPHeaderField: "Authorization"))
            let stream = try XCTUnwrap(incoming.httpBodyStream)
            stream.open(); defer { stream.close() }
            var bytes = [UInt8](repeating: 0, count: 4096)
            let count = stream.read(&bytes, maxLength: bytes.count)
            let body = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(bytes.prefix(max(0, count)))) as? [String: Any])
            XCTAssertEqual(Set(body.keys), ["id", "pauseId", "type", "ruleId", "source", "at"])
            XCTAssertEqual(body["type"] as? String, "drop_selected")
            XCTAssertEqual(body["source"] as? String, "ios")
            return (200, try JSONSerialization.data(withJSONObject: ["eventId": event.id, "score": 130, "delta": 130, "amountCents": 6499]))
        }
        let transport = try HTTPFriendApprovalTransport(baseURL: URL(string: "https://pact.test")!, accessToken: String(repeating: "x", count: 32), session: session)
        let receipt = try await transport.recordScoreEvent(event)
        XCTAssertEqual(receipt.eventId, event.id)
    }

    private func makeSession() -> URLSession {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [ApprovalURLProtocol.self]
        return URLSession(configuration: configuration)
    }
}

private final class ApprovalURLProtocol: URLProtocol, @unchecked Sendable {
    private static let lock = NSLock()
    nonisolated(unsafe) private static var storedHandler: (@Sendable (URLRequest) throws -> (Int, Data))?
    static var handler: (@Sendable (URLRequest) throws -> (Int, Data))? {
        get { lock.lock(); defer { lock.unlock() }; return storedHandler }
        set { lock.lock(); defer { lock.unlock() }; storedHandler = newValue }
    }
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let handler = try XCTUnwrap(Self.handler)
            let (status, data) = try handler(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
