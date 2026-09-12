FROM node:22-bookworm

# Instala Chromium e dependências para Phantomas / Puppeteer / YellowLabTools
RUN apt-get update && apt-get install -y \
    openssl \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PHANTOMAS_CHROMIUM_EXECUTABLE=/usr/local/bin/chromium-no-sandbox

# Wrapper script para Chromium de alta performance em memória
RUN printf '#!/bin/sh\nexec /usr/bin/chromium \\\n  --no-sandbox \\\n  --disable-gpu \\\n  --disable-software-rasterizer \\\n  --disable-features=IsolateOrigins,site-per-process \\\n  --disable-background-networking \\\n  --disable-background-timer-throttling \\\n  --disable-backgrounding-occluded-windows \\\n  --disable-breakpad \\\n  --disable-component-extensions-with-background-pages \\\n  --disable-extensions \\\n  --mute-audio \\\n  --no-default-browser-check \\\n  --no-first-run \\\n  "$@"\n' > /usr/local/bin/chromium-no-sandbox \
    && chmod +x /usr/local/bin/chromium-no-sandbox

WORKDIR /app

# Copia arquivos de dependência da raiz e subpastas
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Copia scripts auxiliares (o postinstall do backend depende deles)
COPY scripts ./scripts

# Instala dependências em cada camada
RUN npm install && \
    cd backend && npm install && \
    cd ../frontend && npm install

# Copia código do projeto
COPY . .

# Gera o Prisma Client no backend
RUN cd backend && npx prisma generate

EXPOSE 3020 3021

CMD ["npm", "run", "dev"]
