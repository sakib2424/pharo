using System.Collections.Frozen;
using System.Collections.Immutable;
using System.Diagnostics.CodeAnalysis;
using Pharo.Api.Statistics;

namespace Pharo.Api.MarketData;

public sealed record InstrumentSnapshot(
    string Ticker,
    ImmutableArray<PricePoint> Prices,
    PriceStatistics Statistics);

/// <summary>A complete, immutable snapshot shared by all requests for this process.</summary>
public sealed class MarketDataStore
{
    private readonly FrozenDictionary<string, InstrumentSnapshot> instruments;

    public MarketDataStore(IReadOnlyDictionary<string, ImmutableArray<PricePoint>> series)
    {
        instruments = series.ToFrozenDictionary(
            entry => entry.Key,
            entry => new InstrumentSnapshot(entry.Key, entry.Value, StatisticsCalculator.Calculate(entry.Value)),
            StringComparer.OrdinalIgnoreCase);
        Tickers = instruments.Keys.Order(StringComparer.Ordinal).ToImmutableArray();
    }

    public ImmutableArray<string> Tickers { get; }

    public bool TryGet(string ticker, [NotNullWhen(true)] out InstrumentSnapshot? instrument) =>
        instruments.TryGetValue(ticker, out instrument);
}
