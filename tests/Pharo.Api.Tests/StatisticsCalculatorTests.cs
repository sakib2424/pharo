using Pharo.Api.MarketData;
using Pharo.Api.Statistics;

namespace Pharo.Api.Tests;

public class StatisticsCalculatorTests
{
    private static PriceStatistics Calculate(params decimal[] values) => StatisticsCalculator.Calculate(
        values.Select((price, index) => new PricePoint(new DateOnly(2026, 1, 1).AddDays(index), price)).ToArray());

    [Fact]
    public void ComputesKnownTotalReturnAndDrawdown()
    {
        var result = Calculate(100, 120, 90, 108);
        Assert.Equal(8, result.TotalReturnPercent!.Value, 10);
        Assert.Equal(25, result.MaxDrawdownPercent!.Value, 10);
    }

    [Fact]
    public void UsesSampleStandardDeviationOfSimpleReturns()
    {
        // Returns are +10% and -10%; sample variance is (0.01 + 0.01) / 1.
        var result = Calculate(100, 110, 99);
        Assert.Equal(Math.Sqrt(0.02) * 100, result.DailyVolatilityPercent!.Value, 10);
        Assert.Equal(-1, result.TotalReturnPercent!.Value, 10);
    }

    [Fact]
    public void DrawdownPeakMustPrecedeTrough()
    {
        Assert.Equal(50, Calculate(100, 50, 200).MaxDrawdownPercent);
        Assert.Equal(0, Calculate(50, 100, 200).MaxDrawdownPercent);
    }

    [Fact]
    public void FlatPricesHaveZeroStatistics()
    {
        Assert.Equal(new PriceStatistics(0, 0, 0), Calculate(100, 100, 100));
    }

    [Fact]
    public void ConstantCompoundedReturnsHaveZeroVolatility()
    {
        Assert.Equal(0, Calculate(100, 110, 121).DailyVolatilityPercent!.Value, 10);
    }

    [Fact]
    public void HandlesInsufficientObservationsExplicitly()
    {
        Assert.Equal(new PriceStatistics(null, null, null), Calculate());
        Assert.Equal(new PriceStatistics(0, null, 0), Calculate(100));
        Assert.Null(Calculate(100, 110).DailyVolatilityPercent);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void RejectsNonpositivePrices(decimal price)
    {
        Assert.Throws<ArgumentException>(() => Calculate(100, price));
    }
}
