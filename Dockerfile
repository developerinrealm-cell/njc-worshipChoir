# ---- Build the React frontend ----
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---- Set up the backend ----
FROM node:20-slim
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./
COPY --from=client-build /app/client/dist ./client-dist

ENV PORT=3001
EXPOSE 3001
CMD ["node", "index.js"]