FROM node:22

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY plugins ./plugins

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/server.js"]
