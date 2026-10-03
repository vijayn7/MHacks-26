import UIKit

enum DemoScreen {
    enum Kind: String, CaseIterable, Identifiable {
        case product = "Product", checkout = "Checkout", receipt = "Receipt"
        var id: String { rawValue }
        var expected: ShoppingStage {
            switch self {
            case .product: .browsing
            case .checkout: .checkout
            case .receipt: .confirmation
            }
        }
    }

    @MainActor
    static func image(_ kind: Kind) -> CGImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: CGSize(width: 720, height: 1000), format: format).image { context in
            UIColor(red: 0.97, green: 0.96, blue: 0.94, alpha: 1).setFill()
            context.fill(CGRect(x: 0, y: 0, width: 720, height: 1000))
            func text(_ value: String, _ y: CGFloat, size: CGFloat = 30, bold: Bool = false) {
                (value as NSString).draw(at: CGPoint(x: 46, y: y), withAttributes: [
                    .font: bold ? UIFont.boldSystemFont(ofSize: size) : UIFont.systemFont(ofSize: size),
                    .foregroundColor: UIColor(red: 0.1, green: 0.15, blue: 0.19, alpha: 1)
                ])
            }
            text("STUDIO / DEMO STORE", 45, size: 23, bold: true)
            switch kind {
            case .product:
                text("The everyday knit", 140, size: 42, bold: true)
                text("Soft cotton. Made for slow mornings.", 220)
                text("$85.00", 310, size: 38)
                text("Choose size", 430, bold: true)
                text("S        M        L        XL", 495)
                text("Add to bag", 715, size: 38, bold: true)
            case .checkout:
                text("Checkout", 140, size: 48, bold: true)
                text("Order summary", 255, size: 34, bold: true)
                text("Everyday knit                       $85.00", 330)
                text("Shipping method", 435, bold: true)
                text("Standard delivery                  $0.00", 490)
                text("Payment method", 580, bold: true)
                text("Choose a payment option", 635)
                text("Order total                            $85.00", 745, bold: true)
                text("Place order", 865, size: 38, bold: true)
            case .receipt:
                text("Order confirmed", 140, size: 44, bold: true)
                text("Thank you for your order", 260, size: 34)
                text("Everyday knit                       $85.00", 390)
                text("Order summary", 510, bold: true)
                text("Order total                            $85.00", 595)
                text("Track delivery", 785, size: 38, bold: true)
            }
            text("SYNTHETIC SCREEN / NO REAL PURCHASE", 955, size: 19)
        }.cgImage!
    }
}
