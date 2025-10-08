# Build stage
FROM node:20-bullseye as build

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/docs/package.json ./apps/docs/

# Fetch dependencies (cache-friendly)
RUN pnpm fetch

# Copy source code
COPY . .

# Install dependencies and build
RUN pnpm i --frozen-lockfile
RUN pnpm --filter @mycelia/docs build

# Runtime stage - static nginx serving
FROM nginx:stable-alpine

# Copy built docs to nginx html directory
COPY --from=build /app/apps/docs/build /usr/share/nginx/html

# Copy nginx configuration if needed
# COPY apps/docs/nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
