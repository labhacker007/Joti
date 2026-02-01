FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci --prefer-offline --no-audit

# Build application
COPY frontend/ .
RUN npm run build


# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run production build
RUN npm install -g serve

# Create non-root user
RUN addgroup -g 1000 -S appuser && \
    adduser -u 1000 -S appuser -G appuser

# Copy built application from builder
COPY --from=builder /app/build ./build

# Set permissions
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000"]
