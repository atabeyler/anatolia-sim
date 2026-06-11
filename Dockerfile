# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --include=dev
COPY client/ ./
RUN npm run build

# Stage 2: Install server dependencies
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev

# Stage 3: Final image
FROM node:20-alpine
WORKDIR /app

# Copy server
COPY server/ ./server/
COPY --from=server-build /app/server/node_modules ./server/node_modules

# Copy built client into server's public folder
COPY --from=client-build /app/client/dist ./server/public

WORKDIR /app/server
EXPOSE 3000
CMD ["node", "src/index.js"]
