# Build stage
FROM node:20-bullseye as build

# Enable corepack for pnpm
RUN corepack enable

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/navigator/package.json ./packages/navigator/

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
COPY packages/navigator/package.json ./packages/navigator/

# Install production dependencies only
RUN pnpm i --prod --frozen-lockfile

# Copy built application
COPY --from=build /app/packages/navigator/dist ./packages/navigator/dist

# Expose the port the app runs on
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/status.json || exit 1

# Define the command to run the app
CMD ["pnpm", "--filter", "@mycelia/navigator", "start"]