FROM ghcr.io/sjinks/codespaces/nodejs:latest@sha256:74fe721fb452224b7ceb081b3b00873ef301d67d926773fd598a87fc19c66a04

RUN \
    apk add --no-cache nginx && \
    sed -i "s/user nginx;/user vscode;/" /etc/nginx/nginx.conf && \
    chown -R vscode:vscode /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R vscode:vscode /usr/src/service
