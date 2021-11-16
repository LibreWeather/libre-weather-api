'use strict';

const express = require('express');

const router = express.Router();

const { logger, UNITS, backends } = require('../utils');
const OpenWeatherMap = require('../backend/OpenWeatherMap');

let BACKEND;

(() => {
  switch (process.env.BACKEND) {
    case backends.OWM:
      BACKEND = new OpenWeatherMap();
      break;
    case backends.METEO:
      break;
    default:
      break;
  }
})();

const getDataByLatLong = async (res, { lat, lon, unit }) => {
  if (!lat || !lon) {
    return res.json({
      error: 'Bad request, either latitude and longitude or weather location code are required.',
      code: 400,
    });
  }

  // fetch from OWM or Meteo depending on config
  const data = await BACKEND.fetch(res, { lat, lon, unit });
  // serialize
  if (data) {
    try {
      return res.json(BACKEND.serialize(data, unit)).end();
    } catch (e) {
      logger.debug(e);
      return res.sendStatus(500).end();
    }
  } else {
    return res.sendStatus(400).end();
  }
};

router.get('/', async (req, res) => {
  if (!BACKEND) res.sendStatus(503);

  // get lat/lon and request data from sources based on location
  const unit = req.header('x-unit') || 'DEFAULT';
  const lat = req.header('x-latitude');
  const lon = req.header('x-longitude');

  await getDataByLatLong(res, { lat, lon, units: unit });
});

router.get('/:lat,:lon/unit/:units', async (req, res) => {
  if (!BACKEND) res.sendStatus(503);

  // get lat/lon and request data from sources based on location
  const unit = req.params.units;
  const { lat, lon } = req.params;

  await getDataByLatLong(res, { lat, lon, unit });
});

router.get('/:lat,:lon', async (req, res) => {
  if (!BACKEND) res.sendStatus(503);

  // get lat/lon and request data from sources based on location
  const unit = UNITS.DEFAULT;
  const { lat } = req.params;
  const { lon } = req.params;

  await getDataByLatLong(res, { lat, lon, unit });
});

module.exports = router;
