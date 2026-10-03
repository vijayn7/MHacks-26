import ReplayKit
import ImageIO

final class SampleHandler: RPBroadcastSampleHandler {
    // One serial queue and at most one retained frame prevent an OCR backlog.
    private let workQueue = DispatchQueue(label: "dev.pact.capture", qos: .utility)
    private let frameGate = NSLock()
    private var frameInFlight = false
    private var lastAcceptedFrame: TimeInterval = -.infinity
    private var store: SessionStore?
    private var snapshot = MonitoringSnapshot()
    private var stabilizer = CheckoutStabilizer()
    private var heartbeat: DispatchSourceTimer?
    private var ended = false
    private var consecutiveErrors = 0

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        workQueue.async { [self] in
            do {
                ended = false
                heartbeat?.cancel()
                stabilizer.reset()
                consecutiveErrors = 0
                store = try SessionStore()
                snapshot = MonitoringSnapshot(state: .starting)
                try store?.save(snapshot)
                let timer = DispatchSource.makeTimerSource(queue: workQueue)
                timer.schedule(deadline: .now(), repeating: 1)
                timer.setEventHandler { [weak self] in self?.tick() }
                heartbeat = timer
                timer.resume()
            } catch { fail("Unable to access Pact's shared App Group. Check signing and capabilities.") }
        }
    }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        // Audio buffers are deliberately discarded. Nothing is uploaded.
        guard sampleBufferType == .video else { return }
        frameGate.lock()
        let now = ProcessInfo.processInfo.systemUptime
        guard !frameInFlight, now - lastAcceptedFrame >= 1 else {
            frameGate.unlock()
            return
        }
        frameInFlight = true
        lastAcceptedFrame = now
        frameGate.unlock()

        workQueue.async { [self] in
            defer {
                frameGate.lock()
                frameInFlight = false
                frameGate.unlock()
            }
            guard !ended, snapshot.state != .paused else { return }
            autoreleasepool {
                let timestamp = Date()
                snapshot.lastFrameAt = timestamp
                snapshot.state = .active
                snapshot.message = nil
                if store?.hostIsVisible(at: timestamp) == true {
                    snapshot.analysis = ScreenAnalysis(stage: .ownApp, signals: [], readableLineCount: 0)
                    snapshot.lastAnalysisAt = timestamp
                    stabilizer.reset()
                    persist()
                    return
                }
                guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
                let raw = (CMGetAttachment(sampleBuffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil) as? NSNumber)?.uint32Value ?? 1
                let orientation = CGImagePropertyOrientation(rawValue: raw) ?? .up
                do {
                    let analysis = try LocalTextReader().read(pixelBuffer: pixelBuffer, orientation: orientation)
                    snapshot.analysis = analysis
                    snapshot.lastAnalysisAt = timestamp
                    if ![ShoppingStage.unknown, .ownApp].contains(analysis.stage) {
                        snapshot.recentShoppingAnalysis = analysis
                        snapshot.recentShoppingAt = timestamp
                    }
                    snapshot.analyzedFrames += 1
                    if stabilizer.observe(analysis.stage, at: timestamp) { snapshot.checkoutCandidates += 1 }
                    consecutiveErrors = 0
                    persist()
                } catch {
                    consecutiveErrors += 1
                    snapshot.analysis = .empty
                    snapshot.message = "Text recognition could not read this frame."
                    stabilizer.reset()
                    if consecutiveErrors >= 5 { fail("Local text recognition stopped after repeated errors. Restart monitoring to try again.") }
                    else { persist() }
                }
            }
        }
    }

    override func broadcastPaused() {
        workQueue.async { [self] in
            guard !ended else { return }
            snapshot.state = .paused
            snapshot.analysis = .empty
            snapshot.recentShoppingAnalysis = .empty
            snapshot.recentShoppingAt = nil
            stabilizer.reset()
            persist()
        }
    }

    override func broadcastResumed() {
        workQueue.async { [self] in
            guard !ended else { return }
            snapshot.state = .starting
            snapshot.analysis = .empty
            persist()
        }
    }

    override func broadcastFinished() {
        workQueue.async { [self] in
            guard !ended else { return }
            ended = true
            heartbeat?.cancel()
            snapshot.finish()
            try? store?.save(snapshot)
        }
    }

    private func tick() {
        guard !ended else { return }
        if store?.stopRequested(for: snapshot.sessionID) == true {
            ended = true
            heartbeat?.cancel()
            snapshot.finish()
            try? store?.save(snapshot)
            // ReplayKit's system picker has no host-side controller. The sample
            // handler's supported termination API presents this reason to iOS.
            finishBroadcastWithError(NSError(domain: "PactMonitoring", code: 0,
                userInfo: [NSLocalizedDescriptionKey: "You stopped Pact monitoring. No screen content was saved."]))
            return
        }
        if snapshot.state == .active,
           let lastFrame = snapshot.lastFrameAt, Date().timeIntervalSince(lastFrame) > 5 {
            snapshot.state = .unavailable
            snapshot.analysis = .empty
            snapshot.message = "No recent screen frames. Capture may be paused or this screen may be unavailable."
            stabilizer.reset()
        }
        if snapshot.state == .starting, Date().timeIntervalSince(snapshot.startedAt) > 10 {
            snapshot.state = .unavailable
            snapshot.message = "iOS hasn't delivered any screen frames. Stop the broadcast and try again."
        }
        if let date = snapshot.lastAnalysisAt, Date().timeIntervalSince(date) > 8 { snapshot.analysis = .empty }
        if let date = snapshot.recentShoppingAt, Date().timeIntervalSince(date) > 60 {
            snapshot.recentShoppingAnalysis = .empty
            snapshot.recentShoppingAt = nil
        }
        persist()
    }

    private func persist() {
        snapshot.updatedAt = Date()
        do { try store?.save(snapshot) }
        catch { fail("Pact could not update its local session. Monitoring has stopped.") }
    }

    private func fail(_ message: String) {
        guard !ended else { return }
        ended = true
        heartbeat?.cancel()
        snapshot.state = .failed
        snapshot.analysis = .empty
        snapshot.recentShoppingAnalysis = .empty
        snapshot.recentShoppingAt = nil
        snapshot.updatedAt = Date()
        snapshot.message = message
        try? store?.save(snapshot)
        finishBroadcastWithError(NSError(domain: "PactMonitoring", code: 1, userInfo: [NSLocalizedDescriptionKey: message]))
    }
}
