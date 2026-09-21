import type { Express } from 'express';
import swagger from 'swagger-stats';
import swaggerui from 'swagger-ui-express';
import helmet from 'helmet';
import cors from 'cors';
import cache from 'apicache';
import fs from 'node:fs';
import yaml from 'js-yaml';
import favicon from 'express-favicon-short-circuit';

const spec = yaml.load(fs.readFileSync('src/api-spec/openapi.yaml', 'utf8')) as object;

const adminCred = {
  user: process.env.ADMIN_USER,
  pass: process.env.ADMIN_PASS,
};
const isProd = false;

export const applyExpressAddons = (http: Express) => {
  http.use(cors());
  http.use(helmet());

  const swaggerAuth = (_req: unknown, user: string, pass: string) =>
    !isProd || (user === adminCred.user && pass === adminCred.pass);
  http.use(
    swagger.getMiddleware({
      swaggerSpec: spec,
      uriPath: '/meta/status',
      onAuthenticate: swaggerAuth,
      authentication: isProd,
    })
  );
  http.use(
    '/docs',
    swaggerui.serve,
    swaggerui.setup(spec, {
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );

  http.use(cache.middleware('20 minutes'));
  http.use(favicon);
};
