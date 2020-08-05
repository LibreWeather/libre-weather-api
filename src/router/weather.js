'use strict';

const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const { logger } = require('../utils');

const OPEN_WEATHER_ROOT = 'https://api.openweathermap.org/data/2.5/onecall';
const APP_ID = process.env.OWM_KEY;

const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);

const getWeatherConditionOWM = (conditionCode, currentTime, sunrise, sunset) => {
  const isDay = currentTime >= sunrise && currentTime < sunset;
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
    return isDay ? 'CLEAR_DAY' : 'CLEAR_NIGHT';
  }
  if (conditionCode >= 801 && conditionCode < 803) {
    return isDay ? 'PARTLY_CLOUDY_DAY' : 'PARTLY_CLOUDY_NIGHT';
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
    case 'metric':
      return 'C';
    default:
      return 'K';
  }
};

const visibilityUnit = (system) => (system === 'IMPERIAL' ? 'MI' : 'M');

const visibilityValue = (system, value) => {
  switch (system) {
    case 'imperial':
      // Convert from meters to miles
      return Number.parseFloat(0.00062137119223733 * value).toPrecision(2);
    default:
      return value;
  }
};

const windSpeedUnit = (system) => (system === 'IMPERIAL' ? 'MPH' : 'MS');

const wrapOWM = (data, unit) => ({
  current: {
    condition: getWeatherConditionOWM(data.current.weather[0].id,
      data.current.dt, data.current.sunrise, data.current.sunset),
    description: capitalize(data.current.weather[0].description),
    summary: data.current.weather[0].main,
    apparentTemp: {
      value: Number.parseFloat(data.current.feels_like).toPrecision(2),
      unit: tempUnit(unit),
    },
    temp: {
      value: Number.parseFloat(data.current.temp).toPrecision(2),
      unit: tempUnit(unit),
    },
    windspeed: {
      magnitude: Number.parseFloat(data.current.wind_speed),
      direction: data.current.wind_deg,
      unit: windSpeedUnit(unit),
    },
    humidity: Number.parseFloat(data.current.humidity).toPrecision(2),
    pressure: {
      value: data.current.pressure,
      unit: 'MB',
    },
    uvIndex: Number.parseFloat(data.current.uvi),
    visibility: {
      value: visibilityValue(unit, Number.parseFloat(data.current.visibility).toPrecision(2)),
      unit: visibilityUnit(unit),
    },
    dewPoint: {
      value: Number.parseFloat(data.current.dew_point),
      unit: tempUnit(unit),
    },
  },
  daily: [].concat(data.daily.map(({ temp }) => {
    const { max, min } = temp;
    return {
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
    };
  })),
  hourly: [].concat(data.hourly.map(({ dt, temp, weather }) => ({
    temp: {
      unit: tempUnit(unit),
      value: temp,
    },
    condition: getWeatherConditionOWM(weather.id,
      dt, data.current.sunrise, data.current.sunset),
  }))),
});

router.get('/', async (req, res) => {
  // get lat/lon and request data from sources based on location

  const unit = req.header('x-unit') || 'DEFAULT';
  const lat = req.header('x-latitude');
  const lon = req.header('x-longitude');

  if (!lat || !lon) return res.json({ error: 'Bad request, either latitude and longitude or weather location code are required.', code: 400 });

  let data;
  if (lat && lon) {
    data = await fetch(`${OPEN_WEATHER_ROOT}?lat=${lat}&lon=${lon}&appid=${APP_ID}&units=${unit}`)
      .then((weather) => weather.json());
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
});

module.exports = router;
