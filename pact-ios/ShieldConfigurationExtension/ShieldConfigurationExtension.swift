import ManagedSettings
import ManagedSettingsUI
import UIKit

final class PactShieldConfiguration: ShieldConfigurationDataSource {
    private let ink = UIColor(red: 0.12, green: 0.19, blue: 0.22, alpha: 1)
    private let paper = UIColor(red: 0.97, green: 0.96, blue: 0.94, alpha: 1)

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        do {
            let store = try CheckoutBlocker.sharedStore()
            let state = try store.read()
            guard let token = application.token, CheckoutBlocker.matches(token, state: state),
                  let pause = state.blockedPause else { return fallback() }
            if pause.decision != nil {
                return basic(title: "A choice worth keeping.", detail: "You chose to leave checkout. This app stays paused. Open Pact and tap Resume selected app when you want to browse again.", primary: "Keep app closed", secondary: nil)
            }
            let opened = try store.update { try $0.open(pause.id, at: Date()) }
            let seconds = opened.secondsRemaining(at: Date())
            let timing: String
            if let approval = opened.approval {
                if approval.status == .denied {
                    timing = "Your friend declined. Choose Drop or Save; this app stays blocked."
                } else if Date() >= approval.expiresAt {
                    timing = "The request expired. Choose Drop or Save, or open Pact to turn off blocking."
                } else if approval.submittedAt != nil {
                    timing = "Waiting for your friend's confirmation. This app stays blocked until approval arrives. Open Pact to check status."
                } else {
                    timing = "Continue requested. Open Pact to check messaging status. This app stays blocked; a text has not been confirmed sent."
                }
            } else {
                timing = seconds > 0
                    ? "Take a 15-second breath. Continue then asks your friend to confirm by text; it does not unlock this app."
                    : "Continue asks your friend to confirm by text. This app stays blocked until approval arrives."
            }
            let details = "PACT LOCAL MONITOR\n\(timing)\nDrop or Save closes this app and keeps it paused until you resume it in Pact."

            // Xcode 26.4 ships Swift 6.3 and the iOS 26.4 SDK. The compiler
            // guard keeps earlier Apple SDKs buildable; runtime availability
            // keeps this binary usable on iOS 17–26.3 as well.
            #if compiler(>=6.3)
            if #available(iOS 26.4, *) {
                return ShieldConfiguration(
                    backgroundBlurStyle: .systemMaterial, backgroundColor: paper,
                    icon: UIImage(systemName: "pause.circle.fill"),
                    title: .init(text: "A little room to decide.", color: ink),
                    subtitle: .init(text: details, color: ink),
                    primaryButtonLabel: .init(text: "Close app", color: .white),
                    primaryButtonBackgroundColor: ink,
                    secondaryButtonLabel: .init(text: "Choose what happens next", color: ink),
                    secondaryButtonSubmenuItems: ["Drop purchase", "Save for later", "Continue"])
            }
            #endif
            return basic(title: "A little room to decide.", detail: "This app is paused. Open Pact manually for Drop / Save / Continue. Continue needs a friend's confirmation by text.", primary: "Drop purchase", secondary: "Close app")
        } catch { return fallback() }
    }

    private func fallback() -> ShieldConfiguration {
        basic(title: "Pact has paused this app.", detail: "Open Pact to review the pause or turn blocking off.", primary: "Close app", secondary: nil)
    }

    private func basic(title: String, detail: String, primary: String, secondary: String?) -> ShieldConfiguration {
        ShieldConfiguration(backgroundBlurStyle: .systemMaterial, backgroundColor: paper,
            icon: UIImage(systemName: "pause.circle.fill"), title: .init(text: title, color: ink),
            subtitle: .init(text: "PACT LOCAL MONITOR\n" + detail, color: ink), primaryButtonLabel: .init(text: primary, color: .white),
            primaryButtonBackgroundColor: ink, secondaryButtonLabel: secondary.map { .init(text: $0, color: ink) })
    }
}
