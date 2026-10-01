FROM node:22

ARG APP_VERSION
ARG APP_REVISION=development
ARG APP_SOURCE=https://github.com/jplayout/CollectionMgnt

LABEL org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_REVISION \
      org.opencontainers.image.source=$APP_SOURCE

WORKDIR /app

ENV NODE_ENV=production \
    APP_VERSION_FILE=/app/VERSION \
    APP_VERSION=$APP_VERSION \
    APP_REVISION=$APP_REVISION

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY backend/plugins ./plugins
COPY VERSION ./VERSION

RUN node --input-type=module -e "import { getBuildInfo } from './src/config/build-info.js'; if (!process.env.APP_VERSION) throw new Error('APP_VERSION build argument is required'); getBuildInfo();"

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/server.js"]
