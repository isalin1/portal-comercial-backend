# --- Build Stage ---
    FROM node:18-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./
    RUN npm install
    
    COPY . .
    RUN npx prisma generate
    RUN npm run build
    s
    # --- Production Stage ---
    FROM node:18-alpine
    
    WORKDIR /app
    
    COPY package*.json ./
    RUN npm install --omit=dev
    
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    
    EXPOSE 3000
    
    CMD ["node", "dist/main.js"]
    