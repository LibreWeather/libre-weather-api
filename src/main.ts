import 'reflect-metadata';
import { config } from 'dotenv';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { applyExpressAddons } from './middleware/addons';
import { logger } from './utils';

if (process.env.NODE_ENV !== 'production') {
  config();
}

async function bootstrap() {
  if (!process.env.BACKEND) {
    logger.error('No BACKEND defined!');
    process.exit(1);
  }

  const http = express();
  applyExpressAddons(http);

  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(http), { logger: false });

  http.use((_req, res) => {
    res.status(404).json({ error: 'No such route.', code: 404 }).end();
  });

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  logger.info(`server is up on ${port}`);
}

bootstrap();
