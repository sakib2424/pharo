using System.Collections.Immutable;
using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

namespace Pharo.Api.MarketData;

public static class CsvMarketDataLoader
{
    public static IReadOnlyDictionary<string, ImmutableArray<PricePoint>> Load(TextReader reader)
    {
        var configuration = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            TrimOptions = TrimOptions.Trim,
        };
        using var csv = new CsvReader(reader, configuration, leaveOpen: true);
        var instruments = new Dictionary<string, SortedDictionary<DateOnly, decimal>>(StringComparer.OrdinalIgnoreCase);

        try
        {
            if (!csv.Read())
            {
                throw new InvalidDataException("The CSV is empty.");
            }

            csv.ReadHeader();
            var headers = csv.HeaderRecord ?? [];
            if (headers.Length != 3 || !headers.Order().SequenceEqual(new[] { "date", "price", "ticker" }))
            {
                throw new InvalidDataException("CSV headers must be date, ticker, price (in any order).");
            }

            while (csv.Read())
            {
                var row = csv.Parser.Row;
                if (csv.Parser.Count != 3)
                {
                    throw new InvalidDataException($"CSV row {row}: expected exactly three fields.");
                }

                var ticker = csv.GetField("ticker")?.Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(ticker) || ticker.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not '.' and not '-' and not '_'))
                {
                    throw new InvalidDataException($"CSV row {row}: ticker must contain letters, digits, dots, hyphens or underscores.");
                }

                if (!DateOnly.TryParseExact(csv.GetField("date"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                {
                    throw new InvalidDataException($"CSV row {row}: date must use yyyy-MM-dd.");
                }

                if (!decimal.TryParse(csv.GetField("price"), NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out var price) || price <= 0)
                {
                    throw new InvalidDataException($"CSV row {row}: price must be a positive decimal number.");
                }

                if (!instruments.TryGetValue(ticker, out var series))
                {
                    instruments[ticker] = series = [];
                }

                if (!series.TryAdd(date, price))
                {
                    throw new InvalidDataException($"CSV row {row}: duplicate date {date:yyyy-MM-dd} for {ticker}.");
                }
            }
        }
        catch (CsvHelperException exception)
        {
            throw new InvalidDataException($"CSV row {csv.Parser.Row}: malformed CSV record.", exception);
        }

        if (instruments.Count == 0)
        {
            throw new InvalidDataException("The CSV contains no price observations.");
        }

        return instruments.ToDictionary(
            pair => pair.Key,
            pair => pair.Value.Select(point => new PricePoint(point.Key, point.Value)).ToImmutableArray(),
            StringComparer.OrdinalIgnoreCase);
    }
}
