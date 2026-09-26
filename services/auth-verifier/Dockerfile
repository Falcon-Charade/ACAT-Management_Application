FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js verify.js ./
USER node
CMD ["node", "server.js"]
