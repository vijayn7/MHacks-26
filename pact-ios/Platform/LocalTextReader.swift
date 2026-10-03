import CoreMedia
import CoreImage
import ImageIO
import Vision

struct LocalTextReader {
    private static let scalingContext = CIContext(options: [.cacheIntermediates: false])
    private enum ReaderError: Error { case cannotScaleFrame }

    func read(pixelBuffer: CVPixelBuffer, orientation: CGImagePropertyOrientation) throws -> ScreenAnalysis {
        let request = makeRequest()
        let source = CIImage(cvPixelBuffer: pixelBuffer)
        let scale = min(1, 1280 / max(source.extent.width, source.extent.height))
        let resized = source.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let image = Self.scalingContext.createCGImage(resized, from: resized.extent) else {
            throw ReaderError.cannotScaleFrame
        }
        try VNImageRequestHandler(cgImage: image, orientation: orientation).perform([request])
        return analyze(request)
    }

    func read(image: CGImage) throws -> ScreenAnalysis {
        let request = makeRequest()
        try VNImageRequestHandler(cgImage: image).perform([request])
        return analyze(request)
    }

    private func makeRequest() -> VNRecognizeTextRequest {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .fast
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = false
        request.minimumTextHeight = 0.012
        request.preferBackgroundProcessing = true
        return request
    }

    private func analyze(_ request: VNRecognizeTextRequest) -> ScreenAnalysis {
        let lines = (request.results ?? []).prefix(100).compactMap { observation -> String? in
            guard let candidate = observation.topCandidates(1).first, candidate.confidence >= 0.35 else { return nil }
            return candidate.string
        }
        return CheckoutAnalyzer().analyze(lines: lines)
    }
}
