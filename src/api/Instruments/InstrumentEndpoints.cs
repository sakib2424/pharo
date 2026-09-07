using System.Collections.Immutable;
using Microsoft.AspNetCore.Http.HttpResults;
using Pharo.Api.MarketData;

namespace Pharo.Api.Instruments;

public sealed record PricesResponse(string Ticker, ImmutableArray<PricePoint> Prices);

public sealed record StatisticsResponse(
    string Ticker,
    double? TotalReturnPercent,
    double? DailyVolatilityPercent,
    double? MaxDrawdownPercent);

public static class InstrumentEndpoints
{
    public static void MapInstrumentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var api = endpoints.MapGroup("/api").WithTags("Instruments");
        api.MapGet("/instruments", (MarketDataStore store) => TypedResults.Ok(store.Tickers))
            .WithName("ListInstruments")
            .WithSummary("List all instrument tickers, sorted alphabetically.");
        api.MapGet("/prices/{ticker}", GetPrices)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithName("GetPrices")
            .WithSummary("Get daily closing prices, ordered from oldest to newest.");
        api.MapGet("/prices/{ticker}/stats", GetStatistics)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithName("GetStatistics")
            .WithSummary("Get total return, sample daily volatility and maximum drawdown in percentage points.");
    }

    private static Results<Ok<PricesResponse>, ProblemHttpResult> GetPrices(string ticker, MarketDataStore store) =>
        store.TryGet(ticker, out var instrument)
            ? TypedResults.Ok(new PricesResponse(instrument.Ticker, instrument.Prices))
            : UnknownTicker(ticker);

    private static Results<Ok<StatisticsResponse>, ProblemHttpResult> GetStatistics(string ticker, MarketDataStore store) =>
        store.TryGet(ticker, out var instrument)
            ? TypedResults.Ok(new StatisticsResponse(instrument.Ticker,
                instrument.Statistics.TotalReturnPercent,
                instrument.Statistics.DailyVolatilityPercent,
                instrument.Statistics.MaxDrawdownPercent))
            : UnknownTicker(ticker);

    private static ProblemHttpResult UnknownTicker(string ticker) =>
        TypedResults.Problem(statusCode: StatusCodes.Status404NotFound, title: "Instrument not found", detail: $"No instrument named '{ticker}' exists in this dataset.");
}
