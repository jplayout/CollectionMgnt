FROM node:22 AS build

ARG APP_VERSION
ARG APP_REVISION=development

ENV APP_VERSION=$APP_VERSION \
    APP_REVISION=$APP_REVISION

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY VERSION /app/VERSION
COPY backend/src/config/build-info.js /app/backend/src/config/build-info.js
COPY backend/package.json /app/backend/package.json
COPY frontend/index.html ./
COPY frontend/vite.config.js ./
COPY frontend/src ./src

RUN test -n "$APP_VERSION" && npm run build

FROM nginx:1.27-alpine

ARG APP_VERSION
ARG APP_REVISION=development
ARG APP_SOURCE=https://github.com/jplayout/CollectionMgnt

LABEL org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$APP_REVISION \
      org.opencontainers.image.source=$APP_SOURCE

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
