import { sampleWeather } from './provider.js';

export function lookupWeather(city) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) throw new Error('Set WEATHER_API_KEY on the server.');
  return sampleWeather(city, apiKey);
}
