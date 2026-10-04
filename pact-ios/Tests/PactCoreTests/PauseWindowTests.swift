import XCTest
@testable import PactCore

final class PauseWindowTests: XCTestCase {
    func testInterruptsUntilAChoiceStartsTheQuietPeriod() {
        let start = Date(timeIntervalSince1970: 1_000)
        var window = PauseWindow()
        XCTAssertTrue(window.shouldInterrupt(at: start))
        window = window.resolving(.continued, at: start)
        XCTAssertFalse(window.shouldInterrupt(at: start.addingTimeInterval(PauseWindow.passDuration - 1)))
        XCTAssertTrue(window.shouldInterrupt(at: start.addingTimeInterval(PauseWindow.passDuration)))
    }

    func testDropAndSaveUseTheSameQuietPeriod() {
        let start = Date(timeIntervalSince1970: 1_000)
        for outcome in [PauseOutcome.dropped, .savedForLater] {
            let window = PauseWindow().resolving(outcome, at: start)
            XCTAssertEqual(window.passUntil, start.addingTimeInterval(PauseWindow.passDuration), outcome.rawValue)
            XCTAssertEqual(window.lastOutcome, outcome)
        }
    }

    func testAskingAFriendDoesNotStartTheQuietPeriod() {
        let start = Date(timeIntervalSince1970: 1_000)
        let window = PauseWindow().resolving(.friendAsked, at: start)
        XCTAssertNil(window.passUntil)
        XCTAssertEqual(window.friendAskedAt, start)
        XCTAssertTrue(window.shouldInterrupt(at: start))
    }

    func testContinueAfterAskingStartsTheQuietPeriod() {
        let start = Date(timeIntervalSince1970: 1_000)
        let window = PauseWindow()
            .resolving(.friendAsked, at: start)
            .resolving(.continued, at: start.addingTimeInterval(20))
        XCTAssertEqual(window.friendAskedAt, start)
        XCTAssertEqual(window.lastOutcome, .continued)
        XCTAssertFalse(window.shouldInterrupt(at: start.addingTimeInterval(30)))
    }

    func testChoiceKeepsTheFriendHandle() {
        let window = PauseWindow(friendHandle: "+15550100100").resolving(.dropped, at: Date(timeIntervalSince1970: 5))
        XCTAssertEqual(window.friendHandle, "+15550100100")
    }

    func testConfirmationsLeaveOutThePurchase() {
        for outcome in [PauseOutcome.dropped, .savedForLater, .continued, .friendAsked] {
            XCTAssertFalse(outcome.confirmation.contains("$"), outcome.rawValue)
            XCTAssertFalse(outcome.confirmation.localizedCaseInsensitiveContains("amazon"), outcome.rawValue)
        }
        XCTAssertFalse(PauseLink.messageBody.contains("$"))
        XCTAssertFalse(PauseLink.messageBody.localizedCaseInsensitiveContains("price"))
    }

    func testMessagesLinkUsesDigitsAndAGenericNote() throws {
        let url = try XCTUnwrap(PauseLink.messagesURL(handle: "+1 (555) 010-0100"))
        XCTAssertTrue(url.absoluteString.hasPrefix("sms:+15550100100&body="))
        XCTAssertFalse(url.absoluteString.localizedCaseInsensitiveContains("price"))
        XCTAssertFalse(url.absoluteString.contains("$"))
        XCTAssertFalse(url.absoluteString.localizedCaseInsensitiveContains("amazon"))
        XCTAssertTrue(url.absoluteString.contains("pause"))
    }

    func testNameOnlyHandleStillOpensMessages() throws {
        let url = try XCTUnwrap(PauseLink.messagesURL(handle: "Mom"))
        XCTAssertTrue(url.absoluteString.hasPrefix("sms:&body="))
    }

    func testStoreRoundTripAndCorruptReset() {
        let defaults = UserDefaults(suiteName: "pact.pause.tests.\(UUID().uuidString)")!
        let store = PauseWindowStore(defaults: defaults)
        let window = PauseWindow(friendHandle: "+1555").resolving(.dropped, at: Date(timeIntervalSince1970: 50))
        store.save(window)
        XCTAssertEqual(store.load(), window)
        defaults.set(Data("nope".utf8), forKey: PauseWindowStore.storageKey)
        XCTAssertEqual(store.load(), PauseWindow())
    }
}
