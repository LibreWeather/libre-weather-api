'use strict';

// eslint-disable-next-line import/no-extraneous-dependencies
if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
const { logger } = require('./utils');
const addons = require('./middleware/addons');

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
