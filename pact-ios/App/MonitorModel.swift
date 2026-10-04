import SwiftUI
import Combine

@MainActor
final class MonitorModel: ObservableObject {
    @Published var snapshot = MonitoringSnapshot()
    @Published var setupError: String?
    @Published var stopPending = false
    @Published var sampleResult: ScreenAnalysis?
    @Published var sampleBusy = false
    @Published var sampleError: String?
    private var store: SessionStore?
    private var visible = true

    static var isSimulator: Bool {
        #if targetEnvironment(simulator)
        true
        #else
        false
        #endif
    }

    init() {
        do { store = try SessionStore() }
        catch { setupError = error.localizedDescription }
        refresh()
    }

    var isRunning: Bool { [.starting, .active, .paused].contains(snapshot.state) }
    var canRequestStop: Bool { isRunning || snapshot.state == .unavailable }
    var statusTitle: String {
        switch snapshot.state {
        case .idle: "Ready when you are"
        case .starting: "Waiting for screen frames"
        case .active: "Monitoring is on"
        case .paused: "Monitoring is paused"
        case .stopped: "Monitoring is off"
        case .unavailable: "Capture needs attention"
        case .failed: "Monitoring stopped"
        }
    }
    var statusDetail: String {
        if stopPending { return "Stop requested. Waiting for the capture extension to confirm." }
        if let message = snapshot.message { return message }
        switch snapshot.state {
        case .idle, .stopped:
            return "Start a session when you want a little more awareness while you shop."
        case .starting:
            return "iOS has started the session. Open another app to begin reading."
        case .active:
            return "Screen text is processed on your iPhone. Return here to see the session summary."
        case .paused:
            return "iOS paused the session. No screen text is being analyzed."
        case .unavailable, .failed:
            return "Check the screen-recording indicator, then restart the session if needed."
        }
    }

    func refresh() {
        do {
            if let latest = try store?.read() {
                snapshot = latest.forDisplay(at: Date())
                if [.stopped, .failed].contains(snapshot.state) { stopPending = false }
            }
            if visible { try store?.setHostVisible(true) }
        } catch { setupError = "The local session is unavailable. Check App Group signing or unlock your iPhone." }
    }

    func setVisible(_ value: Bool) {
        visible = value
        try? store?.setHostVisible(value)
        if value { refresh() }
    }

    func stop() {
        do {
            guard let store else { return }
            try store.requestStop(sessionID: snapshot.sessionID)
            if let pauses = try? CheckoutBlocker.sharedStore() { try? CheckoutBlocker.release(pauses) }
            CheckoutBlocker.settings.clearAllSettings()
            stopPending = true
        } catch { setupError = "Couldn't send the stop request. Use the iPhone screen-recording indicator to stop." }
    }

    func clearSummary() {
        guard !canRequestStop else { return }
        do {
            snapshot = MonitoringSnapshot()
            try store?.save(snapshot)
        } catch { setupError = "Couldn't clear the local summary." }
    }

    func analyzeSample(_ kind: DemoScreen.Kind) async {
        sampleBusy = true
        sampleError = nil
        sampleResult = nil
        let image = DemoScreen.image(kind)
        let result = await Task.detached(priority: .userInitiated) {
            Result { try LocalTextReader().read(image: image) }
        }.value
        switch result {
        case .success(let analysis): sampleResult = analysis
        case .failure: sampleError = "The sample couldn't be read. Try again."
        }
        sampleBusy = false
    }

    // Runs the actual Vision pipeline on synthetic, non-personal screens.
    // Results go into the simulator app container for repeatable verification.
    func verifyOCR() async {
        var results: [[String: String]] = []
        for kind in DemoScreen.Kind.allCases {
            await analyzeSample(kind)
            results.append(["sample": kind.rawValue, "expected": kind.expected.rawValue,
                "actual": sampleResult?.stage.rawValue ?? "error",
                "passed": sampleResult?.stage == kind.expected ? "true" : "false"])
        }
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("ocr-verification.json")
        if let data = try? JSONSerialization.data(withJSONObject: results, options: .prettyPrinted) {
            try? data.write(to: url, options: .atomic)
        }
    }
}
