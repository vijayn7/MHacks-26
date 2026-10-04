import Foundation

enum PauseOutcome: String, Codable, Equatable, Sendable {
    case dropped, savedForLater, continued, friendAsked

    var title: String {
        switch self {
        case .dropped: "Purchase dropped."
        case .savedForLater: "Saved for later."
        case .continued: "You can go ahead."
        case .friendAsked: "Text ready."
        }
    }

    var confirmation: String {
        switch self {
        case .dropped:
            "Nothing was bought. Switch back to the shopping app. Pact stays quiet for 15 minutes."
        case .savedForLater:
            "Saved on this iPhone as a reminder. The item name and price were not stored. Pact stays quiet for 15 minutes."
        case .continued:
            "Switch back to the shopping app. Pact stays quiet for 15 minutes."
        case .friendAsked:
            "Messages has a generic note. It does not name the item or the price. Come back here to drop, save, or continue."
        }
    }
}

struct PauseWindow: Codable, Equatable, Sendable {
    var passUntil: Date?
    var lastOutcome: PauseOutcome?
    var friendAskedAt: Date?
    var friendHandle: String

    static let passDuration: TimeInterval = 15 * 60

    init(passUntil: Date? = nil, lastOutcome: PauseOutcome? = nil, friendAskedAt: Date? = nil, friendHandle: String = "") {
        self.passUntil = passUntil
        self.lastOutcome = lastOutcome
        self.friendAskedAt = friendAskedAt
        self.friendHandle = friendHandle
    }

    func shouldInterrupt(at now: Date) -> Bool {
        guard let passUntil else { return true }
        return now >= passUntil
    }

    func resolving(_ outcome: PauseOutcome, at now: Date) -> PauseWindow {
        var copy = self
        copy.lastOutcome = outcome
        switch outcome {
        case .friendAsked:
            copy.friendAskedAt = now
        case .dropped, .savedForLater, .continued:
            copy.passUntil = now.addingTimeInterval(Self.passDuration)
        }
        return copy
    }
}

enum PauseLink {
    static let messageBody = "Hey, I'm about to buy something and I wanted a pause. Can you tell me to wait if this seems unnecessary?"

    static func messagesURL(handle: String) -> URL? {
        let digits = String(handle.unicodeScalars.filter { CharacterSet.phoneDigits.contains($0) })
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: "&+=?#")
        guard let encoded = messageBody.addingPercentEncoding(withAllowedCharacters: allowed) else { return nil }
        let raw = digits.isEmpty ? "sms:&body=\(encoded)" : "sms:\(digits)&body=\(encoded)"
        return URL(string: raw)
    }
}

private extension CharacterSet {
    static let phoneDigits = CharacterSet(charactersIn: "+0123456789")
}

struct PauseWindowStore {
    static let storageKey = "pact.pause-window"
    let defaults: UserDefaults

    static var live: PauseWindowStore { PauseWindowStore(defaults: .standard) }

    func load() -> PauseWindow {
        guard let data = defaults.data(forKey: Self.storageKey),
              let window = try? JSONDecoder().decode(PauseWindow.self, from: data) else {
            return PauseWindow()
        }
        return window
    }

    func save(_ window: PauseWindow) {
        guard let data = try? JSONEncoder().encode(window) else { return }
        defaults.set(data, forKey: Self.storageKey)
    }
}
