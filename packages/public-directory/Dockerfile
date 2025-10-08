FROM node:20-bullseye AS build
RUN corepack enable
WORKDIR /work
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch
COPY packages/public-directory packages/public-directory
COPY packages packages
RUN pnpm i --frozen-lockfile
RUN pnpm --filter @mycelia/public-directory build

FROM node:20-bullseye
WORKDIR /app
COPY --from=build /work/packages/public-directory/dist ./dist
COPY packages/public-directory/package.json ./
RUN corepack enable && pnpm i -P --prod --frozen-lockfile || true
EXPOSE 8080
CMD ["node","dist/index.js"]