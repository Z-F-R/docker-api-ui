# Official Playwright image: Ubuntu + Chromium/Firefox/WebKit with all system deps.
# The image tag must match the @playwright/test version in package.json.
FROM mcr.microsoft.com/playwright:v1.64.0-noble

# socat forwards localhost:3000/5173 inside this container to the app/frontend containers
RUN apt-get update \
    && apt-get install -y --no-install-recommends socat \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /e2e

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x /e2e/entrypoint.sh

ENTRYPOINT ["/e2e/entrypoint.sh"]
CMD ["npx", "playwright", "test"]
