import SwiftUI

struct PauseCardView: View {
    @ObservedObject var model: PauseModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                switch model.phase {
                case .deciding: deciding
                case .resolved: resolved
                case .quiet: quiet
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(PactStyle.paper)
        .foregroundStyle(PactStyle.ink)
        .preferredColorScheme(.light)
        .interactiveDismissDisabled(model.blocksDismissal)
    }

    private var deciding: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("TAKE A SECOND").pactEyebrow()
            Text("Before you buy.")
                .font(.system(size: 40, weight: .semibold, design: .serif))
                .tracking(-1.2)
            Text("You opened a shopping app. Pact cannot see the item or the price.")
                .font(.system(size: 16))
                .foregroundStyle(PactStyle.muted)
                .lineSpacing(3)
            Text("After you drop, save, or continue, Pact stays quiet for 15 minutes.")
                .font(.system(size: 14))
                .foregroundStyle(PactStyle.muted)
                .lineSpacing(3)
            if let friendNote = model.friendNote {
                Text(friendNote)
                    .font(.system(size: 14))
                    .lineSpacing(3)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(PactStyle.paleCoral, in: RoundedRectangle(cornerRadius: 16))
            }
            VStack(spacing: 10) {
                choice("Drop", prominent: true) { model.resolve(.dropped) }
                choice("Save for later") { model.resolve(.savedForLater) }
                choice("Continue") { model.resolve(.continued) }
                Button(action: askFriend) {
                    Text("Ask my friend")
                        .font(.system(size: 16, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .foregroundStyle(PactStyle.ink)
                        .background(PactStyle.paleCoral, in: RoundedRectangle(cornerRadius: 14))
                }
                .buttonStyle(.plain)
            }
            if model.source == .preview {
                Button("Close preview") { model.dismiss() }
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(PactStyle.muted)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var resolved: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("PACT").pactEyebrow()
            Text(model.window.lastOutcome?.title ?? "Choice saved.")
                .font(.system(size: 36, weight: .semibold, design: .serif))
                .tracking(-1)
            Text(model.window.lastOutcome?.confirmation ?? "Switch back to the shopping app.")
                .font(.system(size: 16))
                .foregroundStyle(PactStyle.muted)
                .lineSpacing(3)
            if let until = model.window.passUntil {
                Text("Quiet until \(until.formatted(date: .omitted, time: .shortened)).")
                    .font(.system(size: 14, weight: .semibold))
            }
            choice("Done", prominent: true) { model.dismiss() }
        }
    }

    private var quiet: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("QUIET PERIOD").pactEyebrow()
            Text("Not a new pause.")
                .font(.system(size: 36, weight: .semibold, design: .serif))
                .tracking(-1)
            Text("The 15 minutes after your last choice are still going. Switch back to the shopping app.")
                .font(.system(size: 16))
                .foregroundStyle(PactStyle.muted)
                .lineSpacing(3)
            if let until = model.window.passUntil {
                Text("Quiet until \(until.formatted(date: .omitted, time: .shortened)).")
                    .font(.system(size: 14, weight: .semibold))
            }
            Text("The shortcut should run Should Interrupt first, and open this card only when that result is true.")
                .font(.system(size: 13))
                .foregroundStyle(PactStyle.muted)
                .lineSpacing(3)
            choice("Done", prominent: true) { model.dismiss() }
        }
    }

    private func choice(_ title: String, prominent: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 16, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .foregroundStyle(prominent ? PactStyle.paper : PactStyle.ink)
                .background(prominent ? PactStyle.ink : Color.white, in: RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(PactStyle.line, lineWidth: prominent ? 0 : 1))
        }
        .buttonStyle(.plain)
    }

    private func askFriend() {
        model.noteFriendAsked()
        guard let url = PauseLink.messagesURL(handle: model.window.friendHandle) else { return }
        openURL(url)
    }
}

struct PauseSetupCard: View {
    @ObservedObject var model: PauseModel
    @Environment(\.openURL) private var openURL
    @State private var handle = ""

    private let steps = [
        "Open Shortcuts, go to Automation, and tap the plus button. Choose App.",
        "Pick a shopping app, choose Is Opened, and turn off Ask Before Running.",
        "Add the Pact action Should Interrupt.",
        "Add If, and run it when Should Interrupt is true.",
        "Inside If, add the Pact action Open Pause. Leave Otherwise empty."
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("SHOPPING INTERRUPT").pactEyebrow()
            Text("A pause when a store opens.")
                .font(.system(size: 24, weight: .semibold, design: .serif))
            Text("A Shortcut brings you here when a shopping app opens. Pact does not cover that app, and it does not read the screen to do this.")
                .font(.system(size: 14))
                .foregroundStyle(PactStyle.muted)
                .lineSpacing(3)
            if let until = model.window.passUntil, until > Date() {
                Text("Quiet until \(until.formatted(date: .omitted, time: .shortened)).")
                    .font(.system(size: 14, weight: .semibold))
                Button("End quiet period") { model.endQuietPeriod() }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(PactStyle.coral)
            }
            VStack(alignment: .leading, spacing: 8) {
                Text("FRIEND'S NUMBER").pactEyebrow()
                TextField("Optional, for Ask my friend", text: $handle)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .padding(12)
                    .background(PactStyle.paper, in: RoundedRectangle(cornerRadius: 12))
                Text("Left blank, Messages opens so you can pick someone. The note stays generic.")
                    .font(.system(size: 12))
                    .foregroundStyle(PactStyle.muted)
                    .lineSpacing(2)
            }
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .top, spacing: 12) {
                        Text(String(format: "%02d", index + 1))
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(PactStyle.coral)
                            .padding(.top, 2)
                        Text(step)
                            .font(.system(size: 13))
                            .foregroundStyle(PactStyle.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
            Button {
                if let url = URL(string: "shortcuts://") { openURL(url) }
            } label: {
                Text("Open Shortcuts")
                    .font(.system(size: 15, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .foregroundStyle(PactStyle.paper)
                    .background(PactStyle.ink, in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            Button { model.preview() } label: {
                Text("Preview the pause")
                    .font(.system(size: 15, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 15)
                    .foregroundStyle(PactStyle.ink)
                    .background(PactStyle.paleCoral, in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 23))
        .onAppear { handle = model.window.friendHandle }
        .onChange(of: handle) { _, newValue in model.updateFriendHandle(newValue) }
    }
}

extension View {
    func pactEyebrow() -> some View {
        font(.system(size: 10, weight: .semibold)).tracking(1.3).foregroundStyle(PactStyle.muted)
    }
}
