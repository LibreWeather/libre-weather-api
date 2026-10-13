FROM docker.io/node:24-alpine

WORKDIR /frontend

COPY package.json .
COPY package-lock.json .

RUN npm ci
COPY src/ /frontend/src/
COPY tsconfig.json nest-cli.json /frontend/
RUN npm run build && npm prune --omit=dev

LABEL org.opencontainers.image.description="LibreWeather Middleware API"
LABEL org.opencontainers.image.source=https://github.com/libreweather/libre-weather-api
LABEL org.opencontainers.image.licenses=AGPL-3.0

ENV NODE_ENV='production'
ENV TZ='UTC'

CMD ["node", "/frontend/dist/main.js"]
