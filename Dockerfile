# --- Build Stage ---
FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

RUN npx prisma generate
COPY . .

RUN npm run build

# --- Production Stage ---
FROM node:18
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY --from=builder /app/dist ./dist

EXPOSE 3002

CMD ["node", "dist/src/main.js"]
    