FROM ghcr.io/sjinks/codespaces/nodejs:latest@sha256:77d4d8df9827637855c0a300616e348e62f07c9889987061dbf37cf91f5c9184

ENV SERVICE_NAME identigraf-uploader

RUN \
    apk add --no-cache nginx vips vips-cpp && \
    sed -i "s/user nginx;/user ${CONTAINER_USER};/" /etc/nginx/nginx.conf && \
    chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /usr/src/service
