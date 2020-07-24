'use strict';

const setup = require('./logger');

module.exports = {
  logger: setup(process.env.SCOPE),
  secret: process.env.AUTH_SECRET,
};
