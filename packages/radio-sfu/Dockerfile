# Build stage
FROM node:20-bullseye as build

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/radio-sfu/package.json ./packages/radio-sfu/

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
COPY packages/radio-sfu/package.json ./packages/radio-sfu/

# Install production dependencies only
RUN pnpm i --prod --frozen-lockfile

# Copy built application
COPY --from=build /app/packages/radio-sfu/dist ./packages/radio-sfu/dist

# Create cache directory
RUN mkdir -p .cache

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the server
CMD ["pnpm", "--filter", "@mycelia/radio-sfu", "start"]