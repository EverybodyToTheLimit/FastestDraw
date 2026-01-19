FROM mcr.microsoft.com/playwright:v1.41.2-jammy
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npx playwright install --with-deps chromium
RUN npm install
COPY / .
EXPOSE 3000
CMD ["/bin/bash", "-c", "npm run migrate && npm start"]