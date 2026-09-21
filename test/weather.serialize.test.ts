import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

import Volume from '../src/utils/volume';
import OpenMeteo from '../src/backend/OpenMeteo';
import OpenWeatherMap from '../src/backend/OpenWeatherMap';
import { Condition, UnitSystem, VolumeUnit } from '../src/types';

const hourIso = (offsetHours) => {
  const date = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
};

const meteoFixture = () => {
  const times = Array.from({ length: 12 }, (_, i) => hourIso(i));
  const n = times.length;
  const fill = (value) => Array.from({ length: n }, () => value);
  const day = times[0].slice(0, 10);
  return {
    utc_offset_seconds: -18000,
    current_weather: {
      temperature: 72.4,
      windspeed: 8.2,
      winddirection: 180,
      weathercode: 61,
    },
    hourly: {
      time: times,
      temperature_2m: fill(70),
      relativehumidity_2m: fill(80),
      dewpoint_2m: fill(62),
      apparent_temperature: fill(74),
      pressure_msl: fill(1013.2),
      weathercode: [61, 61, 3, 3, 2, 2, 1, 0, 0, 0, 80, 61],
      cloudcover: fill(90),
      precipitation: [0.1, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.4],
      precipitation_probability: [80, 70, 20, 10, 5, 0, 0, 0, 0, 10, 40, 90],
      rain: [0.1, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0.05, 0.4],
      snowfall: fill(0),
      windspeed_10m: fill(9),
      winddirection_10m: fill(200),
      windgusts_10m: fill(14),
      uv_index: [0, 0, 1, 2, 4, 6, 7, 6, 4, 2, 0, 0],
      visibility: fill(16093),
      sunshine_duration: [0, 0, 600, 1800, 3600, 3600, 3600, 2400, 600, 0, 0, 0],
    },
    daily: {
      time: [day, hourIso(24).slice(0, 10)],
      temperature_2m_max: [77, 81],
      temperature_2m_min: [64, 66],
      apparent_temperature_max: [80, 84],
      apparent_temperature_min: [63, 65],
      sunrise: [`${day}T06:45`, `${hourIso(24).slice(0, 10)}T06:46`],
      sunset: [`${day}T19:20`, `${hourIso(24).slice(0, 10)}T19:18`],
      weathercode: [61, 2],
      precipitation_sum: [0.7, 0],
      precipitation_probability_max: [90, 10],
      precipitation_hours: [4, 0],
      rain_sum: [0.7, 0],
      snowfall_sum: [0, 0],
      windspeed_10m_max: [14, 8],
      windgusts_10m_max: [22, 12],
      winddirection_10m_dominant: [200, 40],
      uv_index_max: [7, 8],
      sunshine_duration: [18000, 25000],
      daylight_duration: [45000, 44800],
    },
  };
};

describe('Volume', () => {
  it('keeps a native imperial inch value without converting mm→in again', () => {
    const volume = Volume.native(0.25, UnitSystem.IMPERIAL);
    assert.equal(volume.unit, VolumeUnit.IN);
    assert.equal(volume.value, 0.25);
  });

  it('treats 0 as a real measurement instead of null', () => {
    const volume = new Volume(0, UnitSystem.METRIC);
    assert.equal(volume.value, 0);
    assert.equal(volume.unit, VolumeUnit.MM);
  });

  it('converts millimetres to inches for IMPERIAL', () => {
    const volume = new Volume(25.4, UnitSystem.IMPERIAL);
    assert.equal(volume.unit, VolumeUnit.IN);
    assert.equal(Number.parseFloat(String(volume.value)).toFixed(2), '1.00');
  });

  it('maps null input to a null magnitude', () => {
    assert.equal(Volume.native(null, UnitSystem.METRIC).value, null);
    assert.equal(new Volume(null, UnitSystem.METRIC).value, null);
  });
});

describe('OpenMeteo.serialize', () => {
  const meteo = new OpenMeteo();

  it('exposes Hourly fields used by the graph (precip, wind, UV, sun, humidity)', () => {
    const mapped = meteo.serialize(meteoFixture(), UnitSystem.IMPERIAL);
    assert.ok(mapped.hourly.length >= 2, 'future hours should survive the now-filter');
    const hour = mapped.hourly[0];
    assert.equal(typeof hour.condition, 'string');
    assert.equal(typeof hour.description, 'string');
    assert.ok(hour.temp);
    assert.ok(hour.apparentTemp);
    assert.ok(hour.dewPoint);
    assert.equal(typeof hour.humidity, 'number');
    assert.equal(typeof hour.precipProbability, 'number');
    assert.ok(hour.precipVolume);
    assert.ok(hour.windspeed);
    assert.equal(typeof hour.uvIndex, 'number');
    assert.equal(typeof hour.sunshineDuration, 'number');
    assert.ok(hour.visibility);
    assert.ok(hour.pressure);
  });

  it('maps WMO rain codes to RAIN and a human description', () => {
    const mapped = meteo.serialize(meteoFixture(), UnitSystem.IMPERIAL);
    const rain = mapped.hourly.find((hour) => hour.condition === Condition.RAIN);
    assert.ok(rain, 'fixture includes rain hours');
    assert.match(rain.description, /rain|drizzle|shower|thunderstorm/i);
  });

  it('keeps rain and snow volumes in the requested unit (no double convert)', () => {
    const mapped = meteo.serialize(meteoFixture(), UnitSystem.IMPERIAL);
    const wet = mapped.hourly.find((hour) => hour.precipVolume.value > 0);
    assert.ok(wet);
    assert.equal(wet.precipVolume.unit, VolumeUnit.IN);
    assert.ok(wet.precipVolume.value >= 0.05);
  });

  it('fills Daily extras: precip chance, wind, UV, sunshine, feels-like range', () => {
    const mapped = meteo.serialize(meteoFixture(), UnitSystem.IMPERIAL);
    assert.ok(mapped.daily.length >= 1);
    const day = mapped.daily[0];
    assert.equal(day.condition, Condition.RAIN);
    assert.equal(typeof day.precipProbability, 'number');
    assert.equal(typeof day.precipHours, 'number');
    assert.ok(day.windspeed);
    assert.equal(typeof day.uvIndex, 'number');
    assert.equal(typeof day.sunshineDuration, 'number');
    assert.ok(day.apparentTemp.min);
    assert.ok(day.apparentTemp.max);
  });

  it('skips hours that already ended', () => {
    const fixture = meteoFixture();
    fixture.hourly.time[0] = hourIso(-3);
    const mapped = meteo.serialize(fixture, UnitSystem.METRIC);
    assert.ok(mapped.hourly.every((hour) => hour.time + 60 * 60 * 1000 > Date.now() - 1000));
  });
});

describe('OpenWeatherMap.serialize', () => {
  const owm = new OpenWeatherMap();
  const payload = {
    current: {
      dt: 1700000000,
      sunrise: 1700001000,
      sunset: 1700040000,
      temp: 68,
      feels_like: 70,
      dew_point: 55,
      humidity: 61,
      pressure: 1015,
      uvi: 3.2,
      visibility: 10000,
      wind_speed: 5,
      wind_deg: 90,
      weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
    },
    daily: [
      {
        dt: 1700000000,
        sunrise: 1700001000,
        sunset: 1700040000,
        temp: { min: 50, max: 75 },
        feels_like: { morn: 52, day: 74, eve: 66, night: 55 },
        humidity: 58,
        pressure: 1014,
        dew_point: 48,
        pop: 0.4,
        rain: 2.2,
        snow: null,
        uvi: 6,
        clouds: 40,
        wind_speed: 7,
        wind_deg: 120,
        wind_gust: 11,
        weather: [{ id: 500, description: 'light rain' }],
      },
    ],
    hourly: [
      {
        dt: 1700000000,
        temp: 68,
        feels_like: 70,
        dew_point: 55,
        humidity: 61,
        pressure: 1015,
        clouds: 20,
        pop: 0.15,
        rain: { '1h': 0.4 },
        snow: null,
        uvi: 1.1,
        visibility: 8000,
        wind_speed: 4,
        wind_deg: 80,
        wind_gust: 7,
        weather: [{ id: 500, description: 'light rain' }],
      },
      {
        dt: 1700003600,
        temp: 66,
        feels_like: 66,
        dew_point: 54,
        humidity: 70,
        pressure: 1016,
        clouds: 80,
        pop: 0,
        uvi: 0,
        visibility: 10000,
        wind_speed: 3,
        wind_deg: 70,
        weather: [{ id: 803, description: 'broken clouds' }],
      },
    ],
  };

  it('reads rain.1h objects and pop as a percent', () => {
    const mapped = owm.serialize(payload, UnitSystem.IMPERIAL);
    assert.equal(mapped.hourly[0].condition, Condition.RAIN);
    assert.equal(mapped.hourly[0].precipProbability, 15);
    assert.ok(mapped.hourly[0].precipVolume.value > 0);
    assert.equal(mapped.hourly[1].condition, Condition.CLOUDY);
    assert.equal(mapped.hourly[1].precipProbability, 0);
  });

  it('capitalizes descriptions and maps daily pop to percent', () => {
    const mapped = owm.serialize(payload, UnitSystem.METRIC);
    assert.equal(mapped.hourly[0].description, 'Light rain');
    assert.equal(mapped.daily[0].precipProbability, 40);
    assert.equal(mapped.daily[0].description, 'Light rain');
  });
});

describe('OpenAPI Hourly/Daily types', () => {
  const spec: any = yaml.load(fs.readFileSync(path.join(__dirname, '../src/api-spec/openapi.yaml'), 'utf8'));

  it('exposes named Hourly, Daily, Current, and TempRange schemas', () => {
    const { schemas } = spec.components;
    assert.ok(schemas.Hourly);
    assert.ok(schemas.Daily);
    assert.ok(schemas.Current);
    assert.ok(schemas.TempRange);
    assert.deepEqual(schemas.Weather.properties.hourly.items.$ref, '#/components/schemas/Hourly');
    assert.deepEqual(schemas.Weather.properties.daily.items.$ref, '#/components/schemas/Daily');
  });

  it('documents graph fields on Hourly', () => {
    const props = spec.components.schemas.Hourly.properties;
    [
      'apparentTemp',
      'cloudCover',
      'dewPoint',
      'humidity',
      'precipProbability',
      'precipVolume',
      'sunshineDuration',
      'uvIndex',
      'visibility',
      'windspeed',
      'windGust',
    ].forEach((key) => {
      assert.ok(props[key], `Hourly.${key} missing from OpenAPI`);
    });
  });
});
