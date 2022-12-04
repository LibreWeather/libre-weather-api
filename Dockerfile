FROM docker.io/node:16-alpine
WORKDIR /frontend
COPY package.json .
COPY package-lock.json .
RUN npm ci --omit dev

COPY src/ /frontend/src/

CMD ["node", "/frontend/src/server.js"]
