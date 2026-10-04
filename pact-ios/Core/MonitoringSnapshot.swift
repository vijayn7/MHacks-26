import Foundation

enum CaptureState: String, Codable, Sendable {
    case idle, starting, active, paused, stopped, unavailable, failed
}

struct MonitoringSnapshot: Codable, Equatable, Sendable {
    var sessionID = UUID()
    var state: CaptureState = .idle
    var startedAt = Date()
    var updatedAt = Date()
    var lastFrameAt: Date?
    var lastAnalysisAt: Date?
    var analyzedFrames = 0
    var checkoutCandidates = 0
    var analysis: ScreenAnalysis = .empty
    var recentShoppingAnalysis: ScreenAnalysis = .empty
    var recentShoppingAt: Date?
    var message: String?
    var interventionMessage: String?

    func forDisplay(at now: Date) -> MonitoringSnapshot {
        var copy = self
        if [.active, .starting, .paused].contains(state), now.timeIntervalSince(updatedAt) > 8 {
            copy.state = .unavailable
            copy.message = "The capture extension is no longer responding. Check the iPhone screen-recording indicator."
        }
        if copy.state != .active || lastAnalysisAt.map({ now.timeIntervalSince($0) > 8 }) ?? true {
            copy.analysis = .empty
        }
        if copy.state != .active || recentShoppingAt.map({ now.timeIntervalSince($0) > 60 }) ?? true {
            copy.recentShoppingAnalysis = .empty
            copy.recentShoppingAt = nil
        }
        return copy
    }

    mutating func finish(at now: Date = Date()) {
        state = .stopped
        updatedAt = now
        analysis = .empty
        recentShoppingAnalysis = .empty
        recentShoppingAt = nil
        lastAnalysisAt = nil
        message = nil
    }
}
