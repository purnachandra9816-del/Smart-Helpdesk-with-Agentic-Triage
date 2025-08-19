# Multi-stage build for production optimization

# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

# Copy package files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build the frontend
RUN npm run build

# Stage 2: Build the backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy server source code
COPY server/ ./

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S helpdesk -u 1001

# Copy server files from builder
COPY --from=backend-builder --chown=helpdesk:nodejs /app/server ./
COPY --from=frontend-builder --chown=helpdesk:nodejs /app/client/dist ./public

# Create necessary directories
RUN mkdir -p logs && chown helpdesk:nodejs logs

# Switch to non-root user
USER helpdesk

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]