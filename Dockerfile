FROM mcr.microsoft.com/playwright:v1.44.1-jammy
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm install
RUN npx playwright install chromium
COPY / .
EXPOSE 3000
CMD ["/bin/bash", "-c", "npm run migrate && npm start"]