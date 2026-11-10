FROM node:26-alpine AS base
RUN npm install -g pnpm@12.18.0
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/spec/package.json packages/spec/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm codegen \
  && pnpm --filter @calendar/web build \
  && pnpm --filter @calendar/server build \
  && pnpm --filter @calendar/server --prod deploy /out/server \
  && cp -r packages/server/drizzle /out/server/drizzle \
  && mkdir -p /out \
  && cp -r packages/web/dist /out/web

FROM base AS runtime
ENV NODE_ENV=production \
    WEB_DIST=/app/web
WORKDIR /app

# The Hexlet check runs the image without a database service and without
# DATABASE_URL, so the image can start PostgreSQL on its own.
# review 2027-03-01: the version follows the base image's Alpine repository.
# hadolint ignore=DL3018
RUN apk add --no-cache postgresql16 postgresql16-contrib \
  && mkdir -p /app/data \
  && chown node:node /app/data

COPY --from=build /out/server /app/server
COPY --from=build /out/web /app/web
COPY docker/entrypoint.sh /app/docker-entrypoint.sh
RUN chmod 755 /app/docker-entrypoint.sh

USER node
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
