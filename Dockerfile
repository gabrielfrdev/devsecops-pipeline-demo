FROM node:20-alpine

WORKDIR /app

COPY --chown=node:node package*.json ./
RUN npm install --production

COPY --chown=node:node src/ ./src/

USER node

EXPOSE 3000

CMD ["node", "src/index.js"]
