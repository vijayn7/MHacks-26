import XCTest
@testable import PactCore

final class RecognitionTests: XCTestCase {
    private let analyzer = CheckoutAnalyzer()

    func testProductPageWithBuyAdvertisementIsNotCheckout() {
        let result = analyzer.analyze(lines: ["Everyday knit", "Choose size", "Add to bag", "Buy now, wear forever"])
        XCTAssertEqual(result.stage, .browsing)
    }

    func testCheckoutLinkAloneIsNotCheckout() {
        XCTAssertEqual(analyzer.analyze(lines: ["Checkout", "Free shipping this week"]).stage, .cart)
    }

    func testCartTotalDoesNotMeanCheckout() {
        XCTAssertEqual(analyzer.analyze(lines: ["Your basket", "Subtotal $85", "Proceed to checkout"]).stage, .cart)
    }

    func testRecognizesFinalOrderScreenAcrossWording() {
        for action in ["Place your order", "PAY NOW", "Complete purchase", "Confirm and pay"] {
            XCTAssertEqual(analyzer.analyze(lines: ["Order total", action]).stage, .checkout, action)
        }
    }

    func testRecognizesEarlyCheckout() {
        XCTAssertEqual(analyzer.analyze(lines: ["Shipping address", "Continue to payment"]).stage, .checkout)
    }

    func testAccountSettingsAreNotCheckout() {
        XCTAssertEqual(analyzer.analyze(lines: ["Account", "Shipping address", "Payment method", "Save changes"]).stage, .unknown)
    }

    func testReceiptOverridesCheckoutLikeContent() {
        XCTAssertEqual(analyzer.analyze(lines: ["Order confirmed", "Order summary", "Payment method", "Checkout our new collection"]).stage, .confirmation)
    }

    func testDoesNotMatchWordsInsideOtherWords() {
        XCTAssertEqual(analyzer.analyze(lines: ["Recheckout", "Postsubtotal", "Repay now"]).stage, .unknown)
    }

    func testOwnUIIsExcluded() {
        let result = analyzer.analyze(lines: ["PACT LOCAL MONITOR", "Order summary", "Place order"])
        XCTAssertEqual(result.stage, .ownApp)
        XCTAssertTrue(result.signals.isEmpty)
    }

    func testPersistedAnalysisCannotContainSensitiveSourceText() throws {
        let result = analyzer.analyze(lines: ["Checkout", "Payment method", "person@example.com", "4111 1111 1111 1111", "123 Private Street"])
        let json = String(decoding: try JSONEncoder().encode(result), as: UTF8.self)
        XCTAssertFalse(json.contains("person@example.com"))
        XCTAssertFalse(json.contains("4111"))
        XCTAssertFalse(json.contains("Private Street"))
        XCTAssertEqual(result.signals, [.checkoutHeading, .payment])
    }

    func testCandidateNeedsTwoObservationsAndDoesNotRepeat() {
        var stabilizer = CheckoutStabilizer()
        let start = Date(timeIntervalSince1970: 100)
        XCTAssertFalse(stabilizer.observe(.checkout, at: start))
        XCTAssertTrue(stabilizer.observe(.checkout, at: start.addingTimeInterval(1)))
        XCTAssertFalse(stabilizer.observe(.checkout, at: start.addingTimeInterval(2)))
        XCTAssertFalse(stabilizer.observe(.browsing, at: start.addingTimeInterval(3)))
        XCTAssertFalse(stabilizer.observe(.checkout, at: start.addingTimeInterval(4)))
        XCTAssertTrue(stabilizer.observe(.checkout, at: start.addingTimeInterval(5)))
    }

    func testDistantObservationsDoNotCombine() {
        var stabilizer = CheckoutStabilizer()
        let start = Date(timeIntervalSince1970: 100)
        XCTAssertFalse(stabilizer.observe(.checkout, at: start))
        XCTAssertFalse(stabilizer.observe(.checkout, at: start.addingTimeInterval(10)))
    }

    func testStaleCaptureNeverAppearsLive() {
        let start = Date(timeIntervalSince1970: 100)
        var snapshot = MonitoringSnapshot(state: .active, startedAt: start, updatedAt: start)
        snapshot.analysis = analyzer.analyze(lines: ["Order summary", "Place order"])
        snapshot.lastAnalysisAt = start
        let stale = snapshot.forDisplay(at: start.addingTimeInterval(9))
        XCTAssertEqual(stale.state, .unavailable)
        XCTAssertEqual(stale.analysis, .empty)
    }

    func testStopAndPauseClearEvidence() {
        var snapshot = MonitoringSnapshot(state: .active)
        snapshot.analysis = analyzer.analyze(lines: ["Order summary", "Place order"])
        snapshot.lastAnalysisAt = Date()
        snapshot.state = .paused
        XCTAssertEqual(snapshot.forDisplay(at: Date()).analysis, .empty)
        snapshot.finish()
        XCTAssertEqual(snapshot.state, .stopped)
        XCTAssertEqual(snapshot.analysis, .empty)
        XCTAssertNil(snapshot.lastAnalysisAt)
    }

    func testRecentSignalSurvivesReturningToPactButExpires() {
        let start = Date(timeIntervalSince1970: 100)
        var snapshot = MonitoringSnapshot(state: .active, startedAt: start, updatedAt: start)
        snapshot.recentShoppingAnalysis = analyzer.analyze(lines: ["Order summary", "Place order"])
        snapshot.recentShoppingAt = start
        snapshot.analysis = ScreenAnalysis(stage: .ownApp, signals: [], readableLineCount: 0)
        XCTAssertEqual(snapshot.forDisplay(at: start.addingTimeInterval(2)).recentShoppingAnalysis.stage, .checkout)
        snapshot.updatedAt = start.addingTimeInterval(61)
        XCTAssertEqual(snapshot.forDisplay(at: start.addingTimeInterval(61)).recentShoppingAnalysis, .empty)
    }

    func testStopClearsRecentSignal() {
        var snapshot = MonitoringSnapshot(state: .active)
        snapshot.recentShoppingAnalysis = analyzer.analyze(lines: ["Order summary", "Place order"])
        snapshot.recentShoppingAt = Date()
        snapshot.finish()
        XCTAssertEqual(snapshot.recentShoppingAnalysis, .empty)
        XCTAssertNil(snapshot.recentShoppingAt)
    }
}
