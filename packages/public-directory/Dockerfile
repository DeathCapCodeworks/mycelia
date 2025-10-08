# Build stage
FROM node:20-bullseye as build

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/public-directory/package.json ./packages/public-directory/

# Fetch dependencies (cache-friendly)
RUN pnpm fetch

# Copy source code
COPY . .

# Install dependencies and build
RUN pnpm i --frozen-lockfile
RUN pnpm -w build

# Runtime stage
FROM node:20-bullseye

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/public-directory/package.json ./packages/public-directory/

# Install production dependencies only
RUN pnpm i --prod --frozen-lockfile

# Copy built application
COPY --from=build /app/packages/public-directory/dist ./packages/public-directory/dist

# Create cache directory
RUN mkdir -p .cache

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the server
CMD ["pnpm", "--filter", "@mycelia/public-directory", "start"]