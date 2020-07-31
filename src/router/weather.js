'use strict';

const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const { logger } = require('../utils');

const OPEN_WEATHER_ROOT = 'https://api.openweathermap.org/data/2.5/onecall';
const APP_ID = process.env.OWM_KEY;

const capitalize = (s) => s && s[0].toUpperCase() + s.slice(1);

const velocityUnit = (system) => (system === 'imperial' ? 'mph' : 'm/s');

const tempUnit = (system) => {
  switch (system) {
    case 'imperial':
      return '°F';
    case 'metric':
      return '°C';
    default:
      return 'K';
  }
};

const distanceFromMeters = (system, distance) => {
  switch (system) {
    case 'imperial':
      return Number.parseFloat(0.00062137119223733 * distance).toPrecision(2);
    default:
      return distance;
  }
}

const distanceUnit = (system) => {
  switch (system) {
    case 'imperial':
      return 'mi';
    default:
      return 'm';
  }
}

const wrapOWM = (data, unit) => ({
  current: {
    condition: data.current.weather[0].id,
    description: capitalize(data.current.weather[0].description),
    descriptionShort: data.current.weather[0].main,
    feelsLike: {
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
      unit: velocityUnit(unit),
    },
    humidity: Number.parseFloat(data.current.humidity).toPrecision(2),
    pressure: {
      value: data.current.pressure,
      unit: 'hPa'
    },
    uvIndex: Number.parseFloat(data.current.uvi),
    visibility: {
      value: distanceFromMeters(unit, Number.parseFloat(data.current.visibility)),
      unit: distanceUnit(unit)
    },
    dewPoint: {
      value: Number.parseFloat(data.current.dew_point),
      unit: tempUnit(unit),
    },
  },
  daily: [].concat(data.daily.map(({ temp }) => {
    const { max, min } = temp;
    return {
      max: {
        unit: tempUnit(unit),
        value: max,
      },
      min: {
        unit: tempUnit(unit),
        value: min,
      },
    };
  })),
});

router.get('/', async (req, res) => {
  // get lat/lon and request data from sources based on location

  const unit = req.header('x-unit') || 'imperial';

  const lat = req.header('x-latitude');
  const lon = req.header('x-longitude');
  const locCd = req.header('x-weather-code');

  if ((!lat || !lon) && !locCd) return res.json({ error: 'Bad request, either latitude and longitude or weather location code are required.', code: 400 });

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
