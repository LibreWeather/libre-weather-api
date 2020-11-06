'use strict';

const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const { logger } = require('../utils');

const OPEN_WEATHER_ROOT = 'https://api.openweathermap.org/data/2.5/onecall';
const APP_ID = process.env.OWM_KEY;

const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);

const getWeatherConditionOWM = (conditionCode) => {
  if (conditionCode >= 200 && conditionCode < 600) {
    return 'RAIN';
  }
  if (conditionCode >= 600 && conditionCode < 611) {
    return 'SNOW';
  }
  if (conditionCode >= 611 && conditionCode < 700) {
    return 'SLEET';
  }
  if (conditionCode >= 701 && conditionCode < 771) {
    return 'FOG';
  }
  if (conditionCode >= 771 && conditionCode < 800) {
    return 'WIND';
  }
  if (conditionCode === 800) {
    return 'CLEAR';
  }
  if (conditionCode >= 801 && conditionCode < 803) {
    return 'PARTLY_CLOUDY';
  }
  if (conditionCode >= 803 && conditionCode < 900) {
    return 'CLOUDY';
  }
  return 'CLOUDY';
};

const tempUnit = (system) => {
  switch (system) {
    case 'IMPERIAL':
      return 'F';
    case 'METRIC':
      return 'C';
    default:
      return 'K';
  }
};

const visibilityUnit = (system) => (system === 'IMPERIAL' ? 'MI' : 'M');

const visibilityValue = (system, value) => {
  switch (system) {
    case 'IMPERIAL':
      // Convert from meters to miles
      return Number.parseFloat(0.00062137119223733 * value).toPrecision(2);
    default:
      return value;
  }
};

const windSpeedUnit = (system) => (system === 'IMPERIAL' ? 'MPH' : 'MS');

const wrapOWM = (data, unit) => ({
  current: {
    apparentTemp: {
      value: Number.parseFloat(data.current.feels_like).toPrecision(2),
      unit: tempUnit(unit),
    },
    condition: getWeatherConditionOWM(data.current.weather[0].id),
    description: capitalize(data.current.weather[0].description),
    dewPoint: {
      value: Number.parseFloat(data.current.dew_point),
      unit: tempUnit(unit),
    },
    humidity: Number.parseFloat(data.current.humidity).toPrecision(2),
    pressure: {
      value: data.current.pressure,
      unit: 'MB',
    },
    summary: data.current.weather[0].main,
    sunrise: data.current.sunrise,
    sunset: data.current.sunset,
    temp: {
      value: Number.parseFloat(data.current.temp).toPrecision(2),
      unit: tempUnit(unit),
    },
    time: data.current.dt,
    uvIndex: Number.parseFloat(data.current.uvi),
    visibility: {
      value: visibilityValue(unit, Number.parseFloat(data.current.visibility).toPrecision(2)),
      unit: visibilityUnit(unit),
    },
    windspeed: {
      magnitude: Number.parseFloat(data.current.wind_speed),
      direction: data.current.wind_deg,
      unit: windSpeedUnit(unit),
    },
  },
  daily: [].concat(
    data.daily.map(({ dt, temp, weather }) => {
      const { max, min } = temp;
      return {
        condition: getWeatherConditionOWM(weather[0].id),
        temp: {
          max: {
            unit: tempUnit(unit),
            value: max,
          },
          min: {
            unit: tempUnit(unit),
            value: min,
          },
        },
        time: dt,
      };
    })
  ),
  hourly: [].concat(
    data.hourly.map(({ dt, temp, weather }) => ({
      condition: getWeatherConditionOWM(weather[0].id),
      temp: {
        unit: tempUnit(unit),
        value: temp,
      },
      time: dt,
    }))
  ),
});

const UNITS = { IMPERIAL: 'IMPERIAL', METRIC: 'METRIC', FREEDOM_UNITS: 'IMPERIAL', DEFAULT: 'DEFAULT' };

const getDataByLatLong = async (res, { lat, lon, unit }) => {
  if (!lat || !lon) {
    return res.json({
      error: 'Bad request, either latitude and longitude or weather location code are required.',
      code: 400,
    });
  }

  let data;
  if (lat && lon) {
    const bundle = `${OPEN_WEATHER_ROOT}?lat=${lat}&lon=${lon}&appid=${APP_ID}&units=${unit}`;
    data = await fetch(bundle).then((weather) => weather.json());
  }

  if (data) {
    try {
      return res.json(wrapOWM(data, unit)).end();
    } catch (e) {
      logger.debug(e);
      return res.sendStatus(500).end();
    }
  } else {
    return res.sendStatus(400).end();
  }
};

router.get('/', async (req, res) => {
  if (!APP_ID) res.sendStatus(500);

  // get lat/lon and request data from sources based on location
  const unit = req.header('x-unit') || 'DEFAULT';
  const lat = req.header('x-latitude');
  const lon = req.header('x-longitude');

  await getDataByLatLong(res, { lat, lon, units: unit });
});

router.get('/:lat,:lon/unit/:units', async (req, res) => {
  if (!APP_ID) res.sendStatus(500);

  // get lat/lon and request data from sources based on location
  const unit = req.params.units;
  const { lat } = req.params;
  const { lon } = req.params;

  await getDataByLatLong(res, { lat, lon, unit });
});

router.get('/:lat,:lon', async (req, res) => {
  if (!APP_ID) res.sendStatus(500);

  // get lat/lon and request data from sources based on location
  const unit = UNITS.DEFAULT;
  const { lat } = req.params;
  const { lon } = req.params;

  await getDataByLatLong(res, { lat, lon, unit });
});

module.exports = router;
