FROM myrotvorets/node-current-build:latest AS base
USER root
WORKDIR /srv/service
RUN chown nobody:nogroup /srv/service
USER nobody:nogroup
COPY --chown=nobody:nogroup ./package.json ./package-lock.json ./tsconfig.json .npmrc ./

FROM base AS deps
RUN npm ci --only=prod

FROM base AS build
RUN \
    npm r --package-lock-only \
        eslint @myrotvorets/eslint-config-myrotvorets-ts @typescript-eslint/eslint-plugin eslint-plugin-import eslint-plugin-prettier prettier eslint-plugin-sonarjs \
        @types/jest jest ts-jest merge supertest @types/supertest jest-sonar-reporter \
        nodemon && \
    npm ci --ignore-scripts && \
    rm -f .npmrc && \
    npm rebuild && \
    npm run prepare --if-present
COPY --chown=nobody:nogroup ./src ./src
RUN npm run build -- --declaration false

FROM myrotvorets/node-current-min
USER root
WORKDIR /srv/service
RUN chown nobody:nogroup /srv/service
COPY healthcheck.sh /usr/local/bin/
HEALTHCHECK --interval=60s --timeout=10s --start-period=5s --retries=3 CMD ["/usr/local/bin/healthcheck.sh"]
USER nobody:nogroup
ENTRYPOINT ["/usr/bin/node", "index.js"]
COPY --chown=nobody:nogroup ./src/specs ./specs
COPY --chown=nobody:nogroup --from=build /srv/service/dist/ ./
COPY --chown=nobody:nogroup --from=deps /srv/service/node_modules ./node_modules
