import SwiftUI

// Designers can replace this presentation independently of the scoring service.
struct PauseScoreCard: View {
    let score: ScoreSummary?
    let message: String?
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Your pause score", systemImage: "star.circle").font(.headline)
            Text(score.map { "\($0.score) points" } ?? "Connect to sync your score")
                .font(.system(size: 28, weight: .semibold, design: .rounded))
            Text("Drop earns the most. Save for later earns a little. Asking a friend to continue deducts points.")
                .font(.subheadline).foregroundStyle(PactStyle.muted)
            if let score {
                Text("Demo price per iPhone pause: \((Double(score.demoAmountCents) / 100).formatted(.currency(code: "USD"))). This is potential spending, not verified money saved.")
                    .font(.caption).foregroundStyle(PactStyle.muted)
            }
            if let message { Text(message).font(.caption).foregroundStyle(PactStyle.coral) }
        }.padding(22).frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 23))
    }
}
