using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Pharo.Api.Instruments;

namespace Pharo.Api.Tests;

public class InstrumentApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient client = factory.CreateClient();

    [Fact]
    public async Task ReturnsEveryTickerInCanonicalSortedOrder()
    {
        var tickers = await client.GetFromJsonAsync<string[]>("/api/instruments");
        Assert.NotNull(tickers);
        Assert.Equal(200, tickers.Length);
        Assert.Equal(tickers.Order(StringComparer.Ordinal), tickers);
        Assert.Equal("TICK0001", tickers[0]);
    }

    [Fact]
    public async Task SeriesIsChronologicalAndLookupIsCaseInsensitive()
    {
        var series = await client.GetFromJsonAsync<PricesResponse>("/api/prices/tick0001");
        Assert.NotNull(series);
        Assert.Equal("TICK0001", series.Ticker);
        Assert.Equal(30, series.Prices.Length);
        Assert.Equal(new DateOnly(2026, 6, 23), series.Prices[0].Date);
        Assert.Equal(190.34m, series.Prices[0].Price);
        Assert.Equal(series.Prices.OrderBy(point => point.Date), series.Prices);
    }

    [Fact]
    public async Task StatisticsMatchIndependentReturnAndDrawdownCalculations()
    {
        var series = (await client.GetFromJsonAsync<PricesResponse>("/api/prices/TICK0001"))!;
        var stats = (await client.GetFromJsonAsync<StatisticsResponse>("/api/prices/TICK0001/stats"))!;
        var expectedReturn = (double)(series.Prices[^1].Price / series.Prices[0].Price - 1) * 100;
        // Exhaustive earlier-peak comparisons are deliberately independent of the production algorithm.
        var expectedDrawdown = series.Prices.SelectMany((point, i) =>
            series.Prices.Take(i + 1).Select(peak => (double)(1 - point.Price / peak.Price) * 100)).Max();
        Assert.Equal(expectedReturn, stats.TotalReturnPercent!.Value, 10);
        Assert.Equal(expectedDrawdown, stats.MaxDrawdownPercent!.Value, 10);
        Assert.True(stats.DailyVolatilityPercent > 0);
    }

    [Theory]
    [InlineData("/api/prices/UNKNOWN")]
    [InlineData("/api/prices/UNKNOWN/stats")]
    [InlineData("/api/unknown-route")]
    public async Task MissingResourcesReturnProblemDetails(string path)
    {
        var response = await client.GetAsync(path);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(404, body.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task ConcurrentReadersReceiveTheSameSnapshot()
    {
        var requests = Enumerable.Range(0, 12).Select(_ => client.GetStringAsync("/api/prices/TICK0001"));
        var responses = await Task.WhenAll(requests);
        Assert.All(responses, response => Assert.Equal(responses[0], response));
    }
}
