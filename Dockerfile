FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3002

#CMD ["node", "--trace-warnings", "dist/src/main.js"]
#CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:reset && node dist/src/main.js"]
