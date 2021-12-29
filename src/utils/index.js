'use strict';

const setup = require('./logger');

module.exports = {
  logger: setup(process.env.SCOPE),
  secret: process.env.AUTH_SECRET,
  units: require('./units'),
  capitalize: require('./capitalize'),
  windspeed: require('./windspeed'),
  volume: require('./volume'),
  backends: require('./backends'),
  visibility: require('./visibility'),
  temp: require('./temp'),
};
