'use strict';

// monitoring
const swagger = require('swagger-stats');
const swaggerui = require('swagger-ui-express');

// security
const helmet = require('helmet');
const cors = require('cors');

// caching
const cache = require('apicache').middleware;

// yaml2json
const y2j = require('yamljson');

const spec = JSON.parse(y2j.convert('src/api-spec/openapi.yaml'));

// Some dependency/config stuff
const adminCred = {
  user: process.env.ADMIN_USER,
  pass: process.env.ADMIN_PASS,
};
const isProd = false; // process.env.NODE_ENV === 'production';

const initSecurity = (app) => {
  app.use(cors());
  app.use(helmet());
};

const initSwagger = (app) => {
  // eslint-disable-next-line max-len
  const swaggerAuth = (req, user, pass) => !isProd || (user === adminCred.user && pass === adminCred.pass);
  const swaggConfig = {
    swaggerSpec: spec,
    uriPath: '/meta/status',
    onAuthenticate: swaggerAuth,
    authentication: isProd,
  };
  app.use(swagger.getMiddleware(swaggConfig));

  app.use(
    '/docs',
    swaggerui.serve,
    swaggerui.setup(spec, {
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );
};

const init = (app) => {
  initSwagger(app);
  initSecurity(app);

  app.use(cache('20 minutes'));

  app.use(require('express-favicon-short-circuit'));
};

module.exports = { init };
