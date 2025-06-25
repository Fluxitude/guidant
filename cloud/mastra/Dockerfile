# Base stage with Node.js and dependencies
FROM node:20-slim as base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build stage
FROM base as build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-slim as production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY --from=build /app/dist ./dist
COPY .env.example ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "dist/index.js"] 