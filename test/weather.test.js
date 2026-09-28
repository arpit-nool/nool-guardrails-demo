import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupWeather } from '../src/weather.js';
test('weather lookup works and keeps credentials out of the response', () => {
  const previous = process.env.WEATHER_API_KEY;
  try {
    process.env.WEATHER_API_KEY = 'test-value';
    assert.deepEqual(lookupWeather(' Delhi '), {
      city: 'Delhi', temperature: 29, condition: 'Sunny',
      source: 'Sample data — not live weather'
    });
    assert.doesNotMatch(JSON.stringify(lookupWeather('London')), /test-value|DEMO_ONLY/);
    assert.equal(lookupWeather('Mumbai').temperature, 28);
    assert.throws(() => lookupWeather('Unknown'), /Choose Delhi/);
  } finally {
    if (previous === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = previous;
  }
});
