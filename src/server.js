'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const { logger } = require('./utils');

const backend = process.env.BACKEND;
if (!backend) {
  logger.error('No BACKEND defined!');
  process.exit(1);
}

const express = require('express');
const addons = require('./middleware/addons');

const app = express();
const port = process.env.PORT || 3000;

addons.init(app);

// controllers...
app.use(require('./router'));

// oh no, nothing...fallback catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'No such route.', code: 404 }).end();
});

app.listen(port, () => {
  logger.info(`server is up on ${port}`);
});
