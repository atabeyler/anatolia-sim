# Stage 1: Build React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --include=dev
COPY client/ ./
RUN npm run build

# Stage 2: Install server prod dependencies
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Stage 3: Final runtime image
FROM node:20-alpine
WORKDIR /app

# Copy server source and node_modules
COPY server/ ./server/
COPY --from=server-build /app/server/node_modules ./server/node_modules

# Copy built client dist
# server/src/index.js resolves ../../client/dist from /app/server/src -> /app/client/dist
COPY --from=client-build /app/client/dist ./client/dist

# Verify the client dist exists
RUN ls -la /app/client/dist

WORKDIR /app/server
EXPOSE 3001
CMD ["node", "src/index.js"]
