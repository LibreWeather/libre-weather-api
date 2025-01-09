'use strict';

const chalk = require('chalk');
const { transports, createLogger, format } = require('winston');

const { combine, label, printf, colorize } = format;

const color = (scope = 'PROC') => {
  let scoped;
  switch (scope.toUpperCase()) {
    case 'PROC':
      scoped = chalk.magenta('PROC');
      break;
    case 'REST':
      scoped = chalk.cyan('REST');
      break;
    case 'SOCK':
      scoped = chalk.yellow('SOCK');
      break;
    default:
      scoped = chalk.red(scope.toUpperCase());
      break;
  }
  return scoped;
};

/**
 * Create a colorized scope
 * @param  {string} [scope=PROC] scope to use for colorizing
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

  logger.add(consoleTransport);
  return logger;
};

module.exports = setup;
