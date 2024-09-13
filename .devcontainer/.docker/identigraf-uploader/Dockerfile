FROM ghcr.io/sjinks/codespaces/nodejs:latest@sha256:561b1f5891a606594b04ec065f28ebd4f4e4ebd58b37cadb0ffbfaccb34a3129

ENV SERVICE_NAME identigraf-uploader

RUN \
    apk add --no-cache nginx vips vips-cpp && \
    sed -i "s/user nginx;/user ${CONTAINER_USER};/" /etc/nginx/nginx.conf && \
    chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /usr/src/service
