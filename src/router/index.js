'use strict';

const router = require('express').Router();

router.use('/weather', require('./latlong'));

module.exports = router;
