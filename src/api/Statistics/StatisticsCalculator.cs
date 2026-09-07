using Pharo.Api.MarketData;

namespace Pharo.Api.Statistics;

public static class StatisticsCalculator
{
    /// <summary>Accepts a chronologically ordered series of strictly positive prices.</summary>
    public static PriceStatistics Calculate(IReadOnlyList<PricePoint> prices)
    {
        if (prices.Count == 0)
        {
            return new(null, null, null);
        }

        // Welford's algorithm avoids cancellation when returns have small variance.
        var count = 0;
        var mean = 0d;
        var squaredDeviations = 0d;
        var peak = prices[0].Price;
        var maxDrawdown = 0m;

        for (var index = 0; index < prices.Count; index++)
        {
            var price = prices[index].Price;
            if (price <= 0)
            {
                throw new ArgumentException("Prices must be strictly positive.", nameof(prices));
            }

            peak = Math.Max(peak, price);
            maxDrawdown = Math.Max(maxDrawdown, (peak - price) / peak);
            if (index == 0)
            {
                continue;
            }

            var dailyReturn = (double)(price / prices[index - 1].Price - 1);
            count++;
            var delta = dailyReturn - mean;
            mean += delta / count;
            squaredDeviations += delta * (dailyReturn - mean);
        }

        return new(
            (double)(prices[^1].Price / prices[0].Price - 1) * 100,
            count >= 2 ? Math.Sqrt(Math.Max(0, squaredDeviations / (count - 1))) * 100 : null,
            (double)maxDrawdown * 100);
    }
}
