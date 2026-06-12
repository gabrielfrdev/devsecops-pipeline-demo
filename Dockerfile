FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm install --production

COPY --chown=node:node src/ ./src/

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
