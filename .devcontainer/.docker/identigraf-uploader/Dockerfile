FROM ghcr.io/sjinks/codespaces/nodejs:latest@sha256:24ccef923bb36e8f9e24cea54e1b2c5d86b6630a2b62cf04f8ed4124b3f25c1a

ENV SERVICE_NAME identigraf-uploader

RUN \
    apk add --no-cache nginx vips vips-cpp && \
    sed -i "s/user nginx;/user ${CONTAINER_USER};/" /etc/nginx/nginx.conf && \
    chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /usr/src/service
