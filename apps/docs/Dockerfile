# Build
FROM node:20-bullseye AS build
RUN corepack enable
WORKDIR /work
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
# copy only what docs needs
COPY apps/docs apps/docs
COPY packages packages
RUN pnpm i --frozen-lockfile
RUN pnpm --filter @mycelia/docs build

# Serve
FROM nginx:stable-alpine
COPY --from=build /work/apps/docs/build /usr/share/nginx/html
HEALTHCHECK CMD wget -qO- http://localhost || exit 1