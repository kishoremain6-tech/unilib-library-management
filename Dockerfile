FROM node:22-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN npm install --omit=dev --prefix backend

COPY backend ./backend
COPY frontend ./frontend

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "backend/server.js"]
