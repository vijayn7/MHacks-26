import ManagedSettings
import Foundation

final class PactShieldAction: ShieldActionDelegate {
    override func handle(action: ShieldAction, for application: ApplicationToken,
                         completionHandler: @escaping (ShieldActionResponse) -> Void) {
        do {
            let store = try CheckoutBlocker.sharedStore()
            let state = try store.read()
            guard CheckoutBlocker.matches(application, state: state), let pause = state.blockedPause else {
                completionHandler(.close); return
            }
            guard pause.decision == nil else { completionHandler(.close); return }
            var decision: CheckoutDecision?
            #if compiler(>=6.3)
            if #available(iOS 26.4, *) {
                switch action {
                case .firstSecondarySubmenuItemPressed: decision = .dropped
                case .secondSecondarySubmenuItemPressed: decision = .saved
                case .thirdSecondarySubmenuItemPressed: decision = .continued
                default: break
                }
            }
            #endif
            if !CheckoutBlocker.supportsSubmenu, action == .primaryButtonPressed { decision = .dropped }
            guard let decision else {
                completionHandler(action == .primaryButtonPressed || !CheckoutBlocker.supportsSubmenu ? .close : .none)
                return
            }
            // Continue queues a friend request; only a verified backend reply
            // can remove this shield. Drop/Save close the app and retain it.
            // Validate elapsed time and persist before touching the shield.
            // The submenu label is not a security or timing boundary.
            try store.update { try $0.resolve(pause.id, decision: decision, at: Date()) }
            try CheckoutBlocker.reconcile(store)
            if decision == .continued {
                let transport = ApprovalBackend.makeTransport()
                guard transport.isConfigured else { completionHandler(.none); return }
                Task {
                    do { try await ApprovalBackend.sync(store, transport: transport) }
                    catch { /* Pending/error requests keep the shield. */ }
                    completionHandler(.none)
                }
            } else { completionHandler(.close) }
        } catch PauseError.stillHolding {
            completionHandler(.none)
        } catch {
            // Never unlock when a decision could not be recorded. The host
            // app has an explicit recovery control for releasing the shield.
            completionHandler(.close)
        }
    }
}
