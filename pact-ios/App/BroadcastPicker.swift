import SwiftUI
import ReplayKit

// The visible system control owns the tap and Apple's confirmation flow.
// No hidden-button tapping, silent capture, or automatic start.
struct BroadcastPicker: UIViewRepresentable {
    func makeUIView(context: Context) -> RPSystemBroadcastPickerView {
        let view = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 52, height: 52))
        view.preferredExtension = PactConfiguration.broadcastBundleID
        view.showsMicrophoneButton = false
        view.tintColor = UIColor(PactStyle.ink)
        view.accessibilityLabel = "Open iOS screen broadcast controls"
        return view
    }
    func updateUIView(_ uiView: RPSystemBroadcastPickerView, context: Context) {}
}
