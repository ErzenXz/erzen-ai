"use node";

import { api } from "../../_generated/api";

// Helper function to get weather data
export async function getWeatherData(
  ctx: any,
  location: string
): Promise<string> {
  try {
    const apiKeyRecord = await ctx.runQuery(api.apiKeys.getByProvider, {
      provider: "openweather",
    });

    let apiKey = "";
    let usingUserKey = false;

    // PRIORITIZE USER'S API KEY FIRST
    if (apiKeyRecord?.apiKey && apiKeyRecord.apiKey.trim().length > 0) {
      apiKey = apiKeyRecord.apiKey.trim();
      usingUserKey = true;
    } else {
      // Use built-in OpenWeather key as fallback
      apiKey = process.env.OPENWEATHER_API_KEY || "";
    }

    if (!apiKey) {
      return `Weather for ${location}: This is simulated weather data. Configure your OpenWeatherMap API key in settings for real weather data. Current: 22°C, Partly cloudy, Humidity: 65%, Wind: 8 km/h NE`;
    }

    // Get coordinates first
    const geoResponse = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`
    );

    if (!geoResponse.ok) {
      throw new Error(`Geocoding API error: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    if (!geoData.length) {
      return `Weather data not found for "${location}". Please check the location name.`;
    }

    const { lat, lon, name, country } = geoData[0];

    // Get weather data
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weather = await weatherResponse.json();

    return `Weather for ${name}, ${country}:
Current: ${Math.round(weather.main.temp)}°C, ${weather.weather[0].description}
Feels like: ${Math.round(weather.main.feels_like)}°C
Humidity: ${weather.main.humidity}%
Wind: ${Math.round(weather.wind.speed * 3.6)} km/h
Pressure: ${weather.main.pressure} hPa
Visibility: ${weather.visibility / 1000} km`;
  } catch (error) {
    return `Weather data unavailable for "${location}": ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
