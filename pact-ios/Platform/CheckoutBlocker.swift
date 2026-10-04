import Foundation
import ManagedSettings

// All targets use the same named settings store. Reconciliation holds the
// shared file lock so a stale capture callback cannot reapply a released block.
enum CheckoutBlocker {
    static var settings: ManagedSettingsStore { ManagedSettingsStore(named: .init("pact.checkout")) }

    static var supportsSubmenu: Bool {
        #if compiler(>=6.3)
        if #available(iOS 26.4, *) { return true }
        #endif
        return false
    }

    static func sharedStore() throws -> InterventionStore {
        try InterventionStore(directory: SessionStore().directory)
    }

    static func reconcile(_ store: InterventionStore) throws {
        try store.update { state in
            guard state.enabled, state.blockedPause != nil, let data = state.applicationTokenData else {
                settings.clearAllSettings()
                return
            }
            let token = try JSONDecoder().decode(ApplicationToken.self, from: data)
            settings.shield.applications = [token]
        }
    }

    static func release(_ store: InterventionStore, disable: Bool = false) throws {
        try store.update {
            $0.releaseBlock(at: Date())
            if disable { $0.enabled = false }
        }
        try reconcile(store)
    }

    static func matches(_ token: ApplicationToken, state: InterventionState) -> Bool {
        guard let data = state.applicationTokenData,
              let selected = try? JSONDecoder().decode(ApplicationToken.self, from: data) else { return false }
        return token == selected
    }
}
