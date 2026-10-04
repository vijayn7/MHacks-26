import SwiftUI
import FamilyControls

struct PactPausePresentation: View {
    @ObservedObject var model: BlockingModel
    var body: some View {
        Group {
            if let pause = model.state.activePause {
                CheckoutPauseView(pause: pause, now: model.now, error: model.error,
                                  onDecision: model.decide, onDisable: model.disable,
                                  messagingConnected: model.messagingConnected, busy: model.busy,
                                  onCheckApproval: { Task { await model.syncFriendApproval() } })
            }
        }.interactiveDismissDisabled()
    }
}

// Presentation only. Designers can replace these views without changing
// detector rules, shared persistence or ShieldAction timing validation.
struct CheckoutBlockingCard: View {
    @ObservedObject var model: BlockingModel

    var body: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                Label("Checkout blocking", systemImage: "hand.raised.fill").font(.headline)
                Spacer()
                Text(model.state.enabled ? "ON" : "OFF").font(.caption.bold())
            }
            Text("Keep the current recognition rules. After two checkout readings, Pact pauses the shopping app you selected.")
                .font(.subheadline).foregroundStyle(PactStyle.muted)
            Text("Choose one shopping app for testing. The reader cannot identify the foreground app, so checkout signals elsewhere can also pause your selected app.")
                .font(.caption).foregroundStyle(PactStyle.muted)
            if !model.authorized {
                Button("Allow Screen Time access") { Task { await model.authorize() } }
                    .buttonStyle(.borderedProminent).disabled(model.busy || MonitorModel.isSimulator)
            } else {
                Button(model.state.applicationTokenData == nil ? "Choose a shopping app" : "Change selected app") { model.choosingApp = true }
                    .buttonStyle(.bordered).disabled(model.state.blockedPause != nil)
                if !model.state.enabled {
                    Button("Enable checkout blocking", action: model.enable).buttonStyle(.borderedProminent)
                        .disabled(model.state.applicationTokenData == nil)
                }
            }
            if let pause = model.state.blockedPause {
                Label(pause.approval != nil && pause.decision == nil ? "Friend confirmation required · app paused" : (pause.decision == nil ? "Selected app is paused" : "Your choice is recorded · app remains paused"), systemImage: "pause.circle")
                    .font(.subheadline.bold())
                if pause.decision == nil {
                    Button("Open pause choices", action: model.openPause).buttonStyle(.borderedProminent)
                } else {
                    Button("Resume selected app", action: model.resumeApp).buttonStyle(.bordered)
                }
            } else if model.state.enabled {
                Button("Test blocker on selected app", action: model.testBlock).buttonStyle(.bordered)
                Text("Then open that app to see the shield. No screen broadcast or transaction is needed for this test.")
                    .font(.caption).foregroundStyle(PactStyle.muted)
            }
            Button("Turn off blocking", role: .destructive, action: model.disable).buttonStyle(.bordered)
            if let error = model.error { Text(error).font(.caption).foregroundStyle(PactStyle.coral).accessibilityIdentifier("blocking-error") }
            if !CheckoutBlocker.supportsSubmenu {
                Text("This build uses the earlier shield UI. The three-choice submenu requires Xcode 26.4+ and iOS 26.4+. Until then, open Pact for all three choices.")
                    .font(.caption).foregroundStyle(PactStyle.muted)
            }
            Text("After the 15-second pause, Continue requests a friend's confirmation by text. The app stays blocked until approval arrives. Drop and Save leave it paused; they cannot clear another app's checkout.")
                .font(.caption).foregroundStyle(PactStyle.muted)
            if !model.messagingConnected {
                Text("Connect the friend messaging service below before choosing Continue. Preview pause UI uses simulated replies.")
                    .font(.caption).foregroundStyle(PactStyle.coral)
            }
        }
        .tint(PactStyle.ink).padding(22).background(.white, in: RoundedRectangle(cornerRadius: 23))
        .sheet(isPresented: $model.choosingApp) {
            NavigationStack {
                FamilyActivityPicker(selection: $model.selection)
                    .navigationTitle("Choose one shopping app")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) { Button("Cancel") { model.choosingApp = false } }
                        ToolbarItem(placement: .confirmationAction) { Button("Save", action: model.saveSelection) }
                    }
                    .safeAreaInset(edge: .bottom) {
                        if let error = model.error { Text(error).font(.caption).padding().background(PactStyle.paper) }
                    }
            }
        }
    }
}

struct CheckoutPauseView: View {
    let pause: CheckoutPause
    let now: Date
    let error: String?
    let onDecision: (CheckoutDecision) -> Void
    let onDisable: () -> Void
    var isPreview = false
    var messagingConnected = false
    var busy = false
    var onCheckApproval: () -> Void = {}
    var onPreviewReply: ((FriendApprovalRequest.Status) -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Text(isPreview ? "UI PREVIEW · NO APPS BLOCKED" : "PACT LOCAL MONITOR · 15 SECOND DEMO").font(.caption2.bold()).tracking(1)
                Text("A little room\nto decide.").font(.system(size: 39, weight: .semibold, design: .serif))
                Text(pause.source == .demo ? "This is your blocker test. Take a breath, then choose what happens next." : "The existing checkout rules matched. Your selected shopping app is paused while you decide.")
                    .foregroundStyle(PactStyle.muted)
                if let approval = pause.approval {
                    approvalStatus(approval)
                } else {
                    Text("0:\(String(format: "%02d", pause.secondsRemaining(at: now)))")
                        .font(.system(size: 60, weight: .light, design: .rounded)).monospacedDigit()
                        .frame(maxWidth: .infinity).accessibilityLabel("\(pause.secondsRemaining(at: now)) seconds remaining")
                }
                if let error { Text(error).font(.subheadline).foregroundStyle(PactStyle.coral) }
                Button("Save for later") { onDecision(.saved) }.buttonStyle(PauseButtonStyle())
                Button("Drop purchase") { onDecision(.dropped) }.buttonStyle(PauseButtonStyle())
                if pause.approval == nil {
                    Button(pause.canContinue(at: now) ? "Continue · ask my friend" : "Continue after the pause") { onDecision(.continued) }
                        .buttonStyle(PauseButtonStyle()).disabled(!pause.canContinue(at: now) || busy)
                }
                Text("Continue asks your friend to confirm by text and keeps the app blocked until approval. Drop and Save keep it paused until you explicitly resume from Pact. Your cart is not changed and Pact never places an order.")
                    .font(.caption).foregroundStyle(PactStyle.muted)
                Button(isPreview ? "End preview" : "Turn off blocking", role: .destructive, action: onDisable).font(.caption)
            }.padding(28)
        }.background(PactStyle.paper).foregroundStyle(PactStyle.ink)
    }

    private func approvalStatus(_ approval: FriendApprovalRequest) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Friend confirmation", systemImage: "person.crop.circle.badge.checkmark").font(.headline)
            if approval.status == .denied {
                Text("Your friend declined. Choose Drop or Save; the app stays paused.")
            } else if now >= approval.expiresAt {
                Text("This request expired. Choose Drop or Save; the app stays paused.")
            } else {
                Text(isPreview ? "Simulated request · waiting for a reply." :
                    (approval.submittedAt != nil ? "Request accepted by the backend. Waiting for your friend's confirmation." :
                        (messagingConnected ? "Preparing your request. The app is still blocked." : "Messaging is not connected. No text has been sent; the app is still blocked.")))
                if isPreview, let onPreviewReply {
                    Button("Simulate CONFIRM reply") { onPreviewReply(.approved) }.buttonStyle(.borderedProminent)
                        .accessibilityIdentifier("simulate-confirm")
                    Button("Simulate decline reply") { onPreviewReply(.denied) }.buttonStyle(.bordered)
                } else if messagingConnected {
                    Button(busy ? "Checking…" : (approval.submittedAt == nil ? "Retry request" : "Check for reply"), action: onCheckApproval)
                        .buttonStyle(.bordered).disabled(busy)
                }
            }
        }.font(.subheadline).padding(18).frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 18))
    }
}

// An isolated, in-memory fixture for Simulator and UI/UX work. This never
// requests Screen Time permission, writes App Group data or applies a shield.
struct SamplePausePreview: View {
    @Environment(\.dismiss) private var dismiss
    @State private var state = InterventionState()
    @State private var now = Date()
    @State private var error: String?
    private let refresh = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        Group {
            if let pause = state.activePause {
                CheckoutPauseView(pause: pause, now: now, error: error, onDecision: { decision in
                    do {
                        let updated = try state.resolve(pause.id, decision: decision, at: Date())
                        if decision == .continued, let request = updated.approval {
                            try state.markApprovalSubmitted(request, at: Date())
                        }
                    }
                    catch { self.error = error.localizedDescription }
                }, onDisable: { dismiss() }, isPreview: true, onPreviewReply: { status in
                    guard let request = state.activePause?.approval else { return }
                    do {
                        try state.applyApprovalReply(.init(requestID: request.id, pauseID: request.pauseID, status: status), at: Date())
                    } catch { self.error = error.localizedDescription }
                })
            } else {
                VStack(spacing: 24) {
                    Text(state.pauses.last?.decision?.title ?? "Preparing preview…").font(.title.bold())
                    Text("Preview only. No shopping app was blocked and no item was purchased or saved.")
                        .multilineTextAlignment(.center)
                    Button("Done") { dismiss() }.buttonStyle(.borderedProminent)
                }.padding(28).frame(maxWidth: .infinity, maxHeight: .infinity).background(PactStyle.paper)
            }
        }
        .onReceive(refresh) { now = $0 }
        .task {
            guard state.pauses.isEmpty else { return }
            state.enabled = true; state.applicationTokenData = Data()
            do {
                let pause = try state.startDemo(at: Date())
                let pendingFixture = ProcessInfo.processInfo.arguments.contains("--preview-friend-pending")
                _ = try state.open(pause.id, at: Date().addingTimeInterval(pendingFixture ? -20 : 0))
                if pendingFixture {
                    let updated = try state.resolve(pause.id, decision: .continued, at: Date())
                    if let request = updated.approval { try state.markApprovalSubmitted(request, at: Date()) }
                }
            } catch { self.error = error.localizedDescription }
        }
    }
}

struct CheckoutHistoryView: View {
    @ObservedObject var model: BlockingModel
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("YOUR CHECKOUT CHOICES").font(.caption.bold()).tracking(1)
            let choices = model.state.pauses.reversed().filter { $0.decision != nil }
            if choices.isEmpty { Text("Choices and saved reminders will appear here.").font(.subheadline) }
            ForEach(Array(choices.prefix(10))) { pause in
                VStack(alignment: .leading, spacing: 4) {
                    Text(pause.decision!.title).font(.subheadline.bold())
                    Text("\(pause.source == .demo ? "Demo" : "Checkout") · \(pause.detectedAt.formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption).foregroundStyle(PactStyle.muted)
                }
            }
            Text("Saved reminders contain a time and choice. Product details, screenshots and prices are not captured.")
                .font(.caption).foregroundStyle(PactStyle.muted)
            Button("Clear completed history", action: model.clearHistory).font(.caption)
        }.padding(22).frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 23))
    }
}

private struct PauseButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.headline).frame(maxWidth: .infinity).padding(18)
            .foregroundStyle(.white).background(PactStyle.ink.opacity(enabled ? (configuration.isPressed ? 0.8 : 1) : 0.4), in: RoundedRectangle(cornerRadius: 15))
    }
}

struct FriendMessagingCard: View {
    @ObservedObject var model: BlockingModel
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("Friend messaging", systemImage: "message").font(.headline)
            Text("Connect to the team's Photon backend. Your friend receives a request only when you choose Continue.")
                .font(.subheadline).foregroundStyle(PactStyle.muted)
            TextField("Backend URL · https://…", text: $model.backendURL)
                .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                .textFieldStyle(.roundedBorder).accessibilityIdentifier("backend-url")
            SecureField("Pact pairing key", text: $model.pairingKey)
                .textInputAutocapitalization(.never).autocorrectionDisabled().textFieldStyle(.roundedBorder)
                .accessibilityIdentifier("backend-pairing-key")
            Button(model.checkingBackend ? "Checking…" : "Save and check connection") { Task { await model.connectBackend() } }
                .buttonStyle(.borderedProminent).disabled(model.checkingBackend || model.state.blockedPause != nil)
            if let status = model.connectionStatus { Text(status).font(.caption).accessibilityIdentifier("backend-status") }
            if model.state.blockedPause != nil {
                Text("Finish or turn off the current pause before changing the connection.").font(.caption)
            }
            Text("Use the Mac's network address on your iPhone, not localhost. Keep both devices on the same network. The pairing key is PACT_IOS_TOKEN; never paste a Photon secret here.")
                .font(.caption).foregroundStyle(PactStyle.muted)
        }.padding(22).frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 23)).tint(PactStyle.ink)
    }
}
