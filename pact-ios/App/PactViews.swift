import SwiftUI

enum PactStyle {
    static let paper = Color(red: 0.97, green: 0.96, blue: 0.94)
    static let ink = Color(red: 0.12, green: 0.19, blue: 0.22)
    static let muted = Color(red: 0.39, green: 0.44, blue: 0.45)
    static let coral = Color(red: 0.89, green: 0.35, blue: 0.24)
    static let paleCoral = Color(red: 0.98, green: 0.89, blue: 0.84)
    static let mint = Color(red: 0.85, green: 0.91, blue: 0.86)
    static let line = Color(red: 0.88, green: 0.88, blue: 0.85)
}

struct PactRootView: View {
    @StateObject private var model = MonitorModel()
    @StateObject private var blocker = BlockingModel()
    @Environment(\.scenePhase) private var scenePhase
    @State private var tab = 0
    @State private var samplePresented = false
    @State private var pausePreviewPresented = false
    private let refresh = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if tab == 0 { monitor }
                    else if tab == 1 { signals }
                    else { privacy }
                }
                .padding(.horizontal, 24)
                .padding(.top, 12)
                .padding(.bottom, 28)
            }
            navigation
        }
        .background(PactStyle.paper)
        .foregroundStyle(PactStyle.ink)
        .preferredColorScheme(.light)
        .onReceive(refresh) { _ in
            model.refresh(); blocker.refresh()
            if scenePhase == .active { Task { await blocker.pollFriendReplyIfNeeded() } }
        }
        .onChange(of: scenePhase) { _, phase in
            model.setVisible(phase == .active)
            if phase == .active { blocker.refresh() }
        }
        .sheet(isPresented: $samplePresented) { SamplePreview(model: model) }
        .sheet(isPresented: $pausePreviewPresented) { SamplePausePreview() }
        .fullScreenCover(isPresented: $blocker.showingPause) {
            PactPausePresentation(model: blocker)
        }
        .task {
            if ProcessInfo.processInfo.arguments.contains("--ocr-self-test") { await model.verifyOCR() }
            if ProcessInfo.processInfo.arguments.contains("--preview-checkout") { samplePresented = true }
            if ProcessInfo.processInfo.arguments.contains("--preview-pause") || ProcessInfo.processInfo.arguments.contains("--preview-friend-pending") { pausePreviewPresented = true }
        }
    }

    private var header: some View {
        HStack(spacing: 11) {
            ZStack {
                RoundedRectangle(cornerRadius: 13).fill(PactStyle.ink).frame(width: 42, height: 42)
                Image(systemName: "pause.fill").font(.system(size: 19, weight: .bold)).foregroundStyle(PactStyle.paper)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("pact").font(.system(size: 26, weight: .bold, design: .rounded)).tracking(-1)
                Text("PACT LOCAL MONITOR").font(.system(size: 8, weight: .semibold)).tracking(1.4).foregroundStyle(PactStyle.muted)
            }
            Spacer()
            HStack(spacing: 5) {
                Image(systemName: "iphone")
                Text("ON DEVICE")
            }
            .font(.system(size: 9, weight: .bold)).tracking(0.8)
            .padding(.horizontal, 10).padding(.vertical, 9)
            .background(.white.opacity(0.8), in: Capsule())
        }
        .padding(.horizontal, 24).padding(.top, 12).padding(.bottom, 18)
    }

    private var monitor: some View {
        Group {
            VStack(alignment: .leading, spacing: 12) {
                Text("A LITTLE SPACE TO CHOOSE").eyebrow()
                Text("Your pause,\nbefore purchase.")
                    .font(.system(size: 39, weight: .semibold, design: .serif)).tracking(-1.5)
                    .fixedSize(horizontal: false, vertical: true)
                Text("Notice the moment browsing becomes buying.")
                    .font(.system(size: 15)).foregroundStyle(PactStyle.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }
            monitoringCard
            CheckoutBlockingCard(model: blocker)
            FriendMessagingCard(model: blocker)
            PauseScoreCard(score: blocker.score, message: blocker.scoreMessage)
            Button("Preview pause UI") { pausePreviewPresented = true }
                .buttonStyle(PactButtonStyle()).accessibilityIdentifier("preview-pause")
            if let message = model.snapshot.interventionMessage {
                Text(message).font(.caption).foregroundStyle(PactStyle.coral)
            }
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "lock.shield").font(.system(size: 21)).foregroundStyle(PactStyle.coral)
                VStack(alignment: .leading, spacing: 5) {
                    Text("Your screen stays yours.").font(.system(size: 15, weight: .semibold))
                    Text("Text recognition runs on this iPhone. No screenshots or audio are saved or uploaded.")
                        .font(.system(size: 13)).foregroundStyle(PactStyle.muted).lineSpacing(3)
                }
            }
            Button { samplePresented = true } label: {
                HStack(spacing: 14) {
                    Image(systemName: "viewfinder").font(.system(size: 22)).foregroundStyle(PactStyle.coral)
                    VStack(alignment: .leading, spacing: 4) {
                        Text("See what Pact can recognize").font(.system(size: 14, weight: .semibold))
                        Text("Try a sample screen · no monitoring needed").font(.system(size: 11)).foregroundStyle(PactStyle.muted)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "arrow.up.right").font(.system(size: 14))
                }
                .padding(18).background(PactStyle.paleCoral.opacity(0.65), in: RoundedRectangle(cornerRadius: 19))
            }.buttonStyle(.plain)
            Text("EARLY PROTOTYPE  ·  LOCAL CHECKOUT PAUSE")
                .font(.system(size: 9, weight: .medium)).tracking(1.2).foregroundStyle(PactStyle.muted)
                .frame(maxWidth: .infinity)
        }
    }

    private var monitoringCard: some View {
        VStack(spacing: 20) {
            HStack {
                Text("SCREEN AWARENESS").eyebrow()
                Spacer()
                Text(model.snapshot.state == .unavailable ? "CHECK" : model.snapshot.state == .paused ? "PAUSED" : model.isRunning ? "SESSION ON" : "OFF")
                    .font(.system(size: 10, weight: .bold)).tracking(1)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(model.isRunning ? PactStyle.mint : PactStyle.paper, in: Capsule())
            }
            ZStack {
                Circle().stroke(PactStyle.line.opacity(0.6), lineWidth: 1).frame(width: 144, height: 144)
                Circle().stroke(PactStyle.line, lineWidth: 1).frame(width: 117, height: 117)
                Circle().fill(model.isRunning ? PactStyle.mint : PactStyle.paleCoral).frame(width: 91, height: 91)
                Image(systemName: model.isRunning ? "viewfinder" : "pause")
                    .font(.system(size: 34, weight: .light)).foregroundStyle(PactStyle.ink)
                Circle().fill(PactStyle.coral).frame(width: 9, height: 9).offset(x: 64, y: -32)
            }.accessibilityHidden(true)
            VStack(spacing: 8) {
                Text(model.statusTitle).font(.system(size: 22, weight: .semibold, design: .rounded))
                Text(model.statusDetail).font(.system(size: 13)).foregroundStyle(PactStyle.muted)
                    .multilineTextAlignment(.center).lineSpacing(3).fixedSize(horizontal: false, vertical: true)
            }
            if MonitorModel.isSimulator {
                Label("Live capture needs a physical iPhone", systemImage: "iphone")
                    .font(.system(size: 12, weight: .medium))
                    .padding(.vertical, 16).frame(maxWidth: .infinity)
                    .background(PactStyle.paper, in: RoundedRectangle(cornerRadius: 14))
            } else if let error = model.setupError {
                Text(error).font(.system(size: 12)).foregroundStyle(PactStyle.coral)
            } else if model.canRequestStop {
                Button(action: model.stop) {
                    Label(model.stopPending ? "Stopping…" : "Stop monitoring", systemImage: "stop.circle")
                        .font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity).padding(.vertical, 16)
                }
                .buttonStyle(.plain).background(PactStyle.paleCoral, in: RoundedRectangle(cornerRadius: 14))
                .disabled(model.stopPending)
                Text("You can also stop from the iPhone screen-recording indicator.")
                    .font(.system(size: 11)).foregroundStyle(PactStyle.muted).multilineTextAlignment(.center)
                if model.snapshot.state == .unavailable || model.stopPending {
                    HStack {
                        Text("Open iOS broadcast controls").font(.system(size: 12))
                        Spacer()
                        BroadcastPicker().frame(width: 44, height: 44)
                    }
                }
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Enable monitoring").font(.system(size: 15, weight: .semibold))
                        Text("Tap the broadcast icon →").font(.system(size: 12)).foregroundStyle(PactStyle.muted)
                    }
                    Spacer()
                    BroadcastPicker().frame(width: 52, height: 52)
                }
                .padding(.leading, 18).padding(.trailing, 8).padding(.vertical, 5)
                .background(PactStyle.paleCoral, in: RoundedRectangle(cornerRadius: 14))
                Text("iOS will ask you to start a screen broadcast. Pact processes it locally; nothing is streamed to a server.")
                    .font(.system(size: 11)).foregroundStyle(PactStyle.muted).multilineTextAlignment(.center)
            }
        }
        .padding(23).background(.white, in: RoundedRectangle(cornerRadius: 27))
        .overlay(RoundedRectangle(cornerRadius: 27).stroke(PactStyle.line.opacity(0.55), lineWidth: 1))
    }

    private var signals: some View {
        Group {
            title("A little awareness.", subtitle: "A live session summary, kept on your phone.")
            HStack(spacing: 12) {
                metric("\(model.snapshot.analyzedFrames)", label: "SCREENS READ", icon: "viewfinder")
                metric("\(model.snapshot.checkoutCandidates)", label: "CANDIDATES", icon: "bag")
            }
            VStack(alignment: .leading, spacing: 18) {
                Text("RECENT SHOPPING SIGNAL").eyebrow()
                Text(model.snapshot.recentShoppingAnalysis.stage.title).font(.system(size: 25, weight: .semibold, design: .serif))
                if model.snapshot.recentShoppingAnalysis.signals.isEmpty {
                    Text(model.isRunning ? "Pact skips its own screen. Open another app during the session to collect signals." : "Start monitoring on an iPhone, or try a sample below.")
                        .font(.system(size: 14)).foregroundStyle(PactStyle.muted).lineSpacing(4)
                } else {
                    signalList(model.snapshot.recentShoppingAnalysis)
                    if let timestamp = model.snapshot.recentShoppingAt {
                        Text("Observed \(timestamp, style: .relative) ago · clears after 60 seconds")
                            .font(.system(size: 11)).foregroundStyle(PactStyle.muted)
                    }
                }
                Text("Signals are clues, not proof of a purchase. When enabled, Screen Time pauses your selected app. No money moves.")
                    .font(.system(size: 12)).foregroundStyle(PactStyle.muted).lineSpacing(3)
            }.card()
            VStack(alignment: .leading, spacing: 14) {
                Text("HOW A SESSION WORKS").eyebrow()
                step("01", "You choose to start", "Confirm with the iOS broadcast control.")
                step("02", "Pact reads locally", "Up to one frame per second, with English text recognition.")
                step("03", "Only clues remain", "Fixed shopping labels appear here. Raw text is discarded.")
            }.card()
            Button { samplePresented = true } label: {
                Label("Explore sample screens", systemImage: "viewfinder").frame(maxWidth: .infinity)
            }.buttonStyle(PactButtonStyle())
            CheckoutHistoryView(model: blocker)
        }
    }

    private var privacy: some View {
        Group {
            title("Built around trust.", subtitle: "You decide when your screen is shared.")
            VStack(alignment: .leading, spacing: 20) {
                Label("Local by design", systemImage: "lock.shield").font(.system(size: 23, weight: .semibold, design: .serif))
                privacyRow("Friend confirmation is optional to set up", "When you choose Continue, Pact sends request IDs and times to your configured backend. Pause choices also sync to calculate your score using a demo price. Photon messages your linked friend. Their matching confirmation releases your pause. Screen content, item details and prices stay off the network.")
                privacyRow("No screen archive", "Frames and recognized text are discarded. Pact stores fixed signals, pause times, choices and an opaque Screen Time token for your selected app. Saved reminders contain no product details.")
                privacyRow("Audio is ignored", "Pact doesn't analyze microphone or app audio. Leave the microphone off in the system broadcast control.")
                privacyRow("A visible, voluntary session", "The iPhone recording indicator stays visible. Stop there at any time. Monitoring never starts automatically.")
            }.card()
            VStack(alignment: .leading, spacing: 12) {
                Text("WHAT TO EXPECT").eyebrow()
                Text("While enabled, iOS can share the whole display, including other apps. Pact cannot reliably identify or restrict capture to a particular app. Use demo data while testing.")
                Text("Some screens are unavailable to capture. Checkout recognition is an English-language heuristic and can miss screens or make mistakes.")
                Text("Blocking applies to the whole app you select. Detection and shield delivery take time, so Pact cannot guarantee it will interrupt every purchase before payment. Turn off blocking here or revoke Pact's Screen Time access to release it.")
            }.font(.system(size: 13)).foregroundStyle(PactStyle.muted).lineSpacing(4).card()
            Button(action: model.clearSummary) {
                Label("Clear local session summary", systemImage: "trash").frame(maxWidth: .infinity)
            }.buttonStyle(PactButtonStyle()).disabled(model.canRequestStop)
            if model.canRequestStop {
                Text("Stop monitoring before clearing the summary.").font(.caption).foregroundStyle(PactStyle.muted)
            }
        }
    }

    private var navigation: some View {
        HStack(spacing: 0) {
            navItem("Monitor", icon: "circle.dotted.circle", value: 0)
            navItem("Signals", icon: "waveform.path", value: 1)
            navItem("Privacy", icon: "hand.raised", value: 2)
        }
        .padding(.top, 16).padding(.bottom, 8)
        .background(PactStyle.paper)
        .overlay(alignment: .top) { Rectangle().fill(PactStyle.line).frame(height: 1) }
    }

    private func navItem(_ label: String, icon: String, value: Int) -> some View {
        Button { tab = value } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.system(size: 21, weight: tab == value ? .semibold : .regular))
                Text(label).font(.system(size: 10, weight: .semibold))
            }.foregroundStyle(tab == value ? PactStyle.coral : PactStyle.muted).frame(maxWidth: .infinity)
        }.buttonStyle(.plain).accessibilityAddTraits(tab == value ? .isSelected : [])
    }

    private func title(_ title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.system(size: 36, weight: .semibold, design: .serif)).tracking(-1)
            Text(subtitle).font(.system(size: 15)).foregroundStyle(PactStyle.muted)
        }
    }

    private func metric(_ value: String, label: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: icon).foregroundStyle(PactStyle.coral)
            Text(value).font(.system(size: 35, weight: .medium, design: .rounded))
            Text(label).font(.system(size: 9, weight: .semibold)).tracking(1).foregroundStyle(PactStyle.muted)
        }.frame(maxWidth: .infinity, alignment: .leading).card()
    }

    private func step(_ number: String, _ title: String, _ detail: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Text(number).font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundStyle(PactStyle.coral).padding(.top, 3)
            VStack(alignment: .leading, spacing: 5) {
                Text(title).font(.system(size: 14, weight: .semibold))
                Text(detail).font(.system(size: 12)).foregroundStyle(PactStyle.muted)
            }
        }
    }

    private func privacyRow(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.system(size: 15, weight: .semibold))
            Text(detail).font(.system(size: 13)).foregroundStyle(PactStyle.muted).lineSpacing(3)
        }
    }
}

struct SamplePreview: View {
    @ObservedObject var model: MonitorModel
    @Environment(\.dismiss) private var dismiss
    @State private var kind: DemoScreen.Kind = .checkout

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("SAMPLE SCREEN · NOT LIVE CAPTURE").eyebrow()
                    Text("Meet your local reader.").font(.system(size: 32, weight: .semibold, design: .serif)).tracking(-1)
                    Text("These synthetic screens go through the same on-device text recognition as a live session.")
                        .font(.system(size: 14)).foregroundStyle(PactStyle.muted).lineSpacing(3)
                    Picker("Sample screen", selection: $kind) {
                        ForEach(DemoScreen.Kind.allCases) { item in Text(item.rawValue).tag(item) }
                    }.pickerStyle(.segmented).disabled(model.sampleBusy)
                    HStack {
                        Spacer()
                        Image(decorative: DemoScreen.image(kind), scale: 1)
                            .resizable().scaledToFit().frame(maxHeight: 300)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(RoundedRectangle(cornerRadius: 16).stroke(PactStyle.line, lineWidth: 1))
                            .accessibilityLabel("Synthetic \(kind.rawValue.lowercased()) screen")
                        Spacer()
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("ON-DEVICE RESULT").eyebrow()
                            Spacer()
                            if model.sampleBusy { ProgressView().tint(PactStyle.coral) }
                        }
                        if let result = model.sampleResult {
                            Text(result.stage.title).font(.system(size: 23, weight: .semibold, design: .rounded))
                            signalList(result)
                            Text("\(result.readableLineCount) text lines read · fixed labels only")
                                .font(.system(size: 11)).foregroundStyle(PactStyle.muted)
                        } else if let error = model.sampleError {
                            Text(error).font(.system(size: 13)).foregroundStyle(PactStyle.coral)
                        } else { Text("Reading the sample…").font(.system(size: 14)) }
                    }.card()
                    Text("This preview does not enable screen capture or add to your session counters.")
                        .font(.system(size: 12)).foregroundStyle(PactStyle.muted)
                }.padding(24)
            }
            .background(PactStyle.paper).foregroundStyle(PactStyle.ink)
            .navigationTitle("Recognition preview").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.tint(PactStyle.coral) } }
            .task(id: kind) { await model.analyzeSample(kind) }
        }.preferredColorScheme(.light)
    }
}

private func signalList(_ analysis: ScreenAnalysis) -> some View {
    VStack(alignment: .leading, spacing: 9) {
        ForEach(analysis.signals, id: \.self) { signal in
            HStack(spacing: 9) {
                Circle().fill(PactStyle.coral).frame(width: 5, height: 5)
                Text(signal.label).font(.system(size: 13))
            }
        }
    }
}

private extension View {
    func card() -> some View {
        padding(22).frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 23))
    }
    func eyebrow() -> some View {
        font(.system(size: 10, weight: .semibold)).tracking(1.3).foregroundStyle(PactStyle.muted)
    }
}

private struct PactButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.system(size: 14, weight: .semibold))
            .foregroundStyle(.white).padding(.vertical, 17).padding(.horizontal, 18)
            .background(PactStyle.ink.opacity(configuration.isPressed ? 0.8 : 1), in: RoundedRectangle(cornerRadius: 15))
    }
}
