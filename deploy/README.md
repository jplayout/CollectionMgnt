# Deployment Files

This directory contains deployment-oriented Compose files.

## Synology

`compose.synology.yml` is a foundation for Synology Container Manager using the prebuilt GHCR images.

The GHCR images are published for `linux/amd64` and `linux/arm64`. Synology ARM64 NAS models, including Realtek RTD1293 based devices, use the `linux/arm64` image. `linux/arm/v7` is not officially supported at this stage.

It exposes only the frontend on the NAS host. The backend stays available only on the internal Docker network, and the frontend proxies `/api` requests to it.

HTTPS through Synology DSM Reverse Proxy is documented in `../docs/deployment/synology-https-reverse-proxy.md`. The recommended setup points DSM to the frontend port only and does not expose the backend.

Update and rollback guidance is documented in `../docs/deployment/update-rollback.md`.

Persistent data is stored by default in:

```text
/volume1/docker/collectionmgnt/data
```

This host path is configurable with `COLLECTIONMGNT_DATA_DIR` if your Synology Docker data lives on another volume or share.

Back up this directory before updating images or changing the deployment. It contains the SQLite database, uploaded media, thumbnails and generated backups.

Keep `JWT_SECRET` strong, at least 32 characters, and stable across restarts and updates.
