FROM ghcr.io/sjinks/codespaces/nodejs:latest@sha256:74fe721fb452224b7ceb081b3b00873ef301d67d926773fd598a87fc19c66a04

ENV SERVICE_NAME identigraf-uploader

RUN \
    apk add --no-cache nginx vips vips-cpp && \
    sed -i "s/user nginx;/user ${CONTAINER_USER};/" /etc/nginx/nginx.conf && \
    chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R "${CONTAINER_USER}:${CONTAINER_USER}" /usr/src/service
