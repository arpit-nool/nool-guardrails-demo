// Local fixture provider: no network calls and no real API credentials.
const cities = {
  delhi: { city: 'Delhi', temperature: 29, condition: 'Sunny' },
  london: { city: 'London', temperature: 16, condition: 'Cloudy' },
  mumbai: { city: 'Mumbai', temperature: 28, condition: 'Light rain' }
};

export function sampleWeather(city, apiKey) {
  if (!apiKey) throw new Error('Missing provider credential.');
  const result = cities[String(city).trim().toLowerCase()];
  if (!result) throw new Error('Choose Delhi, London, or Mumbai.');
  // The credential is never included in the browser response.
  return { ...result, source: 'Sample data — not live weather' };
}
