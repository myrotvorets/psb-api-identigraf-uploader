FROM ghcr.io/sjinks/codespaces/nodejs:latest

RUN \
    apk add --no-cache nginx && \
    sed -i "s/user nginx;/user vscode;/" /etc/nginx/nginx.conf && \
    chown -R vscode:vscode /run/nginx /var/log/nginx /var/lib/nginx

COPY rootfs /
WORKDIR /usr/src/service

RUN chown -R vscode:vscode /usr/src/service
