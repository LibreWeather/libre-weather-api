'use strict';

require('colors');
const { transports, createLogger, format } = require('winston');

const { combine, label, printf, colorize } = format;

const color = (scope = 'PROC') => {
  let scoped;
  switch (scope.toUpperCase()) {
    case 'PROC':
      scoped = 'PROC'.magenta;
      break;
    case 'REST':
      scoped = 'REST'.cyan;
      break;
    case 'SOCK':
      scoped = 'SOCK'.yellow;
      break;
    default:
      scoped = scope.toUpperCase().red;
      break;
  }
  return scoped;
};

/**
 * Create a colorized scope
 * @param  {string} scope [description]
 * @returns {Object}       set up logger
 */
const setup = (scope = 'PROC') => {
  /* Logger setup */
  const consoleTransport = new transports.Console({ colorize: true });

  const logFormat = printf((info) => `[${info.label}] ${info.level}: ${info.message}`);
  const logger = createLogger({
    level: process.env.LOG_LEVEL || 'error',
    format: combine(colorize(), label({ label: color(scope) }), logFormat),
    transports: [
      new transports.File({ filename: 'error.log', level: 'error' }),
      new transports.File({ filename: 'combined.log' }),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(consoleTransport);
  }
  return logger;
};

module.exports = setup;
