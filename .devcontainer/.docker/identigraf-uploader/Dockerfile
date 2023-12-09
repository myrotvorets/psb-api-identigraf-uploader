FROM ghcr.io/sjinks/codespaces/nodejs:latest@sha256:f4eac4886860d35a13f8fabd6466a8a42fc1d7b88d7c0f17efece90733d7df0c

ENV SERVICE_NAME identigraf-uploader

RUN \
    apk add --no-cache nginx vips vips-cpp && \
    sed -i "s/user nginx;/user ${CONTAINER_USER};/" /etc/nginx/nginx.conf && \
    chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /usr/src/service
