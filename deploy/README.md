# Deployment Files

This directory contains deployment-oriented Compose files.

## Synology

`compose.synology.yml` is a foundation for Synology Container Manager using the prebuilt GHCR images.

It exposes only the frontend on the NAS host. The backend stays available only on the internal Docker network, and the frontend proxies `/api` requests to it.

Persistent data is stored in:

```text
/volume1/docker/collectionmgnt/data
```

Back up this directory before updating images or changing the deployment. It contains the SQLite database, uploaded media, thumbnails and generated backups.

Keep `JWT_SECRET` strong, at least 32 characters, and stable across restarts and updates. Reverse proxy and HTTPS setup will be documented separately.
