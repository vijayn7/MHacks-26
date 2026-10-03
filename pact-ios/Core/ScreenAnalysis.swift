import Foundation

enum ShoppingStage: String, Codable, Sendable {
    case unknown, browsing, cart, checkout, confirmation, ownApp

    var title: String {
        switch self {
        case .unknown: "No clear shopping signals"
        case .browsing: "Browsing a product"
        case .cart: "Cart detected"
        case .checkout: "Possible checkout"
        case .confirmation: "Order confirmation"
        case .ownApp: "Pact is open"
        }
    }
}

// Only this fixed vocabulary leaves the OCR pipeline. No raw text, amounts,
// addresses, identifiers, or screenshots are included in shared snapshots.
enum ScreenSignal: String, Codable, CaseIterable, Sendable {
    case checkoutHeading, orderSummary, orderTotal, delivery, payment
    case purchaseAction, continueAction, addToBag, cart, confirmation

    var label: String {
        switch self {
        case .checkoutHeading: "Checkout heading"
        case .orderSummary: "Order summary"
        case .orderTotal: "Order total"
        case .delivery: "Delivery options"
        case .payment: "Payment options"
        case .purchaseAction: "Purchase action"
        case .continueAction: "Next-step action"
        case .addToBag: "Add to bag"
        case .cart: "Shopping cart"
        case .confirmation: "Order confirmed"
        }
    }

    var phrases: [String] {
        switch self {
        case .checkoutHeading: ["checkout", "check out"]
        case .orderSummary: ["order summary", "review your order", "review order"]
        case .orderTotal: ["order total", "grand total", "total due", "subtotal"]
        case .delivery: ["shipping address", "delivery address", "delivery options", "shipping method"]
        case .payment: ["payment method", "payment details", "payment options", "billing address"]
        case .purchaseAction: ["place order", "place your order", "pay now", "complete purchase", "confirm and pay"]
        case .continueAction: ["continue to payment", "continue to delivery", "continue to shipping"]
        case .addToBag: ["add to bag", "add to cart", "add to basket", "choose size", "select size"]
        case .cart: ["your bag", "your cart", "your basket", "shopping bag", "shopping cart", "proceed to checkout"]
        case .confirmation: ["order confirmed", "order confirmation", "thank you for your order", "thanks for your order", "order placed"]
        }
    }
}

struct ScreenAnalysis: Codable, Equatable, Sendable {
    var stage: ShoppingStage
    var signals: [ScreenSignal]
    var readableLineCount: Int

    static let empty = ScreenAnalysis(stage: .unknown, signals: [], readableLineCount: 0)
}

struct CheckoutAnalyzer {
    func analyze(lines: [String]) -> ScreenAnalysis {
        // Bound work as well as transient memory in the broadcast extension.
        let text = lines.prefix(100).map { String($0.prefix(300)) }
            .joined(separator: "\n").folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US"))
        if text.contains("pact local monitor") {
            return ScreenAnalysis(stage: .ownApp, signals: [], readableLineCount: 0)
        }
        let signals = ScreenSignal.allCases.filter { signal in
            signal.phrases.contains { phrase in
                text.range(of: "\\b" + NSRegularExpression.escapedPattern(for: phrase) + "\\b", options: .regularExpression) != nil
            }
        }
        let set = Set(signals)
        let stage: ShoppingStage
        if set.contains(.confirmation) {
            stage = .confirmation
        } else if (set.contains(.purchaseAction) && !set.isDisjoint(with: [.orderTotal, .orderSummary, .payment]))
                    || (set.contains(.checkoutHeading) && !set.isDisjoint(with: [.delivery, .payment, .orderSummary]))
                    || (set.contains(.continueAction) && !set.isDisjoint(with: [.delivery, .payment])) {
            stage = .checkout
        } else if set.contains(.cart) || set.contains(.checkoutHeading) {
            stage = .cart
        } else if set.contains(.addToBag) {
            stage = .browsing
        } else {
            stage = .unknown
        }
        return ScreenAnalysis(stage: stage, signals: signals, readableLineCount: min(lines.count, 100))
    }
}

struct CheckoutStabilizer {
    private var previousTime: Date?
    private var consecutive = 0
    private var latched = false

    // Counts a candidate once, after two adjacent observations. This is a
    // heuristic, not a probability or a verified purchase/impulse detector.
    mutating func observe(_ stage: ShoppingStage, at now: Date) -> Bool {
        guard stage == .checkout else {
            reset()
            return false
        }
        if let previousTime, now.timeIntervalSince(previousTime) > 3 { reset() }
        previousTime = now
        consecutive += 1
        if consecutive >= 2 && !latched {
            latched = true
            return true
        }
        return false
    }

    mutating func reset() {
        previousTime = nil
        consecutive = 0
        latched = false
    }
}
