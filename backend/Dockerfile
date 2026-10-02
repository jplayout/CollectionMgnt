FROM node:22.23.3-alpine3.24 AS dependencies

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22.23.3-alpine3.24 AS runtime

# Package managers are build tools, not runtime dependencies of this application.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-v* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg

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

COPY backend/package.json ./
COPY --from=dependencies /app/node_modules ./node_modules

COPY backend/src ./src
COPY backend/plugins ./plugins
COPY VERSION ./VERSION

RUN node --input-type=module -e "import { getBuildInfo } from './src/config/build-info.js'; if (!process.env.APP_VERSION) throw new Error('APP_VERSION build argument is required'); getBuildInfo();"

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/server.js"]
