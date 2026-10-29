FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.9 --activate
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
  && pnpm --filter @calendar/server --prod deploy --legacy /out/server \
  && cp -r packages/server/drizzle /out/server/drizzle \
  && mkdir -p /out \
  && cp -r packages/web/dist /out/web

FROM base AS runtime
ENV NODE_ENV=production \
    WEB_DIST=/app/web
WORKDIR /app
COPY --from=build /out/server /app/server
COPY --from=build /out/web /app/web
USER node
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
