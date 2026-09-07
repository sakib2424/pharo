namespace Pharo.Api.Statistics;

/// <summary>All values use percentage points: 8 means 8%.</summary>
public sealed record PriceStatistics(
    double? TotalReturnPercent,
    double? DailyVolatilityPercent,
    double? MaxDrawdownPercent);
