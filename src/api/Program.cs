using Pharo.Api.Instruments;
using Pharo.Api.MarketData;

var builder = WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.Strict);
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var configuredPath = builder.Configuration["MarketData:Path"];
var dataPath = configuredPath is null
    ? Path.Combine(AppContext.BaseDirectory, "Data", "market_data.csv")
    : Path.GetFullPath(configuredPath, builder.Environment.ContentRootPath);

// A bad dataset is a startup failure, never a partially populated response.
using var reader = File.OpenText(dataPath);
var store = new MarketDataStore(CsvMarketDataLoader.Load(reader));
builder.Services.AddSingleton(store);

var app = builder.Build();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.MapInstrumentEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// API requests must never fall through to the React entry point.
app.Map("/api/{**path}", () => Results.Problem(statusCode: 404, title: "API endpoint not found"))
    .ExcludeFromDescription();
if (Directory.Exists(app.Environment.WebRootPath ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot")))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

app.Logger.LogInformation("Loaded {InstrumentCount} instruments from {DataPath}", store.Tickers.Length, dataPath);
app.Run();

// Exposes the entry point to WebApplicationFactory without a second host.
public partial class Program;
