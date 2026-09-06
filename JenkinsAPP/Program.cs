var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Add OpenAPI
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Serve index.html and other files from wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();

// Controller endpoints
app.MapControllers();

app.Run();