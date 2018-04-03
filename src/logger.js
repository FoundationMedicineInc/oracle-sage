const winston = require('winston');

const logger = new winston.Logger({
  transports: [new winston.transports.Console({ level: 'error' })],
});

module.exports = logger;
