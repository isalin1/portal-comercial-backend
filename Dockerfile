FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3002

#MODIFCAR CODIGO DE LA APP -> "node dist/src/main.js"
#CMD ["sh", "-c", "node dist/src/main.js"]

#MODIFICAS BD (SCHEMA) -> "npx prisma migrate deploy && node dist/src/main.js"
#CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]


#MODIFICAS BD (SCHEMA) Y SEED (AGREGAR/QUITAR DATOS DE MAESTROS) -> "npx prisma migrate deploy && npm run prisma:reset && node dist/src/main.js"
CMD ["sh", "-c", "npx prisma migrate deploy && npm run prisma:seed && node dist/src/main.js"]
