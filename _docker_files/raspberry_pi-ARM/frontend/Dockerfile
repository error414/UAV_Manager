# 1. Verwende eine arm-kompatible Node-Version
FROM --platform=linux/arm/v7 node:20

# 2. Setze Arbeitsverzeichnis
WORKDIR /app

# 3. Baue ARGs ein
ARG NODE_ENV=production
ARG VITE_API_URL

ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}

# 4. System-Abhängigkeiten für native Module
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 5. Kopiere package-Dateien
COPY package*.json ./

# 6. Workaround für Rollup-ARM Bug: Entferne Lock & node_modules vor Neuinstallation
RUN rm -rf node_modules package-lock.json && npm install --include=dev

# 7. Kopiere restliche Files
COPY . .

# 8. Baue das Projekt
RUN npm run build

# 9. Offen für Vite Dev Server
EXPOSE 5175

# 10. Starte Dev-Server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5175"]
