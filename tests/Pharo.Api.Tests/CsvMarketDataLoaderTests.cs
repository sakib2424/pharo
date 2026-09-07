using System.Globalization;
using Pharo.Api.MarketData;

namespace Pharo.Api.Tests;

public class CsvMarketDataLoaderTests
{
    [Fact]
    public void NormalizesTickersSortsDatesAndAcceptsQuotedFields()
    {
        using var reader = new StringReader("date,ticker,price\n2026-01-02, abc ,110\n2026-01-01,\"ABC\",100\n");
        var data = CsvMarketDataLoader.Load(reader);
        Assert.Single(data);
        Assert.Equal([100m, 110m], data["ABC"].Select(point => point.Price));
    }

    [Fact]
    public void UsesInvariantCulture()
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("fr-FR");
            using var reader = new StringReader("ticker,price,date\nABC,10.25,2026-01-01");
            Assert.Equal(10.25m, CsvMarketDataLoader.Load(reader)["ABC"][0].Price);
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
    }

    [Theory]
    [InlineData("date,ticker,price\n2026-01-01,ABC,0", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,ABC,-10", "row 2")]
    [InlineData("date,ticker,price\n2026-02-30,ABC,10", "row 2")]
    [InlineData("date,ticker,price\n01/01/2026,ABC,10", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,,10", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,A/B,10", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,ABC,NaN", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,ABC", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,ABC,10,extra", "row 2")]
    [InlineData("date,ticker,price\n2026-01-01,ABC,10\n2026-01-01,abc,11", "duplicate")]
    [InlineData("wrong,ticker,price", "headers")]
    [InlineData("date,ticker,price", "no price")]
    [InlineData("", "empty")]
    public void RejectsBadInputWithActionableErrors(string content, string message)
    {
        using var reader = new StringReader(content);
        var error = Assert.Throws<InvalidDataException>(() => CsvMarketDataLoader.Load(reader));
        Assert.Contains(message, error.Message, StringComparison.OrdinalIgnoreCase);
    }
}
