FROM docker.io/node:20-alpine

WORKDIR /frontend

COPY package.json .
COPY package-lock.json .
COPY .babelrc.json .

RUN npm ci --omit dev

COPY src/ /frontend/src/

LABEL org.opencontainers.image.description="LibreWeather Middleware API"
LABEL org.opencontainers.image.source=https://github.com/libreweather/libre-weather-api
LABEL org.opencontainers.image.licenses=AGPL-3.0

ENV NODE_ENV='production'
ENV TZ='UTC'

CMD ["node", "/frontend/src/server.js"]
