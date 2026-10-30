package imed.moveanalysisservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record FinalizeLiveAnalysisRequest(
        @Min(0) @Max(500) Integer expectedPlies,
        @Size(max = 1_000_000) String pgn
) {
}
