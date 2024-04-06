FROM myrotvorets/node-build:latest@sha256:69a1606039e710c2cb1b3c7b3aaf44250c4e6eca024adf092f835dd1ae08d4fe AS build
USER root
WORKDIR /srv/service
RUN chown nobody:nobody /srv/service && apk add --no-cache vips-dev
USER nobody:nobody
COPY --chown=nobody:nobody ./package.json ./package-lock.json ./tsconfig.json .npmrc* ./
RUN \
    npm ci --ignore-scripts --userconfig .npmrc.local && \
    rm -f .npmrc.local && \
    npm rebuild && \
    npm run prepare --if-present
COPY --chown=nobody:nobody ./src ./src
RUN npm run build -- --declaration false --removeComments true --sourceMap false
RUN npm prune --omit=dev

FROM myrotvorets/node-min@sha256:5785a3061c65bb57e6efd574b4574c31846f46127777ca373d32d5f4cae7943a
USER root
WORKDIR /srv/service
RUN chown nobody:nobody /srv/service && apk add --no-cache vips vips-cpp
USER nobody:nobody
ENTRYPOINT ["/usr/bin/node", "index.mjs"]
COPY --chown=nobody:nobody --from=build /srv/service/node_modules ./node_modules
COPY --chown=nobody:nobody ./src/specs ./specs
COPY --chown=nobody:nobody --from=build /srv/service/dist/ ./
COPY --chown=nobody:nobody ./package.json ./
