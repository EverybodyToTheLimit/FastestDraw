FROM mcr.microsoft.com/playwright:v1.40.0-jammy
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npx playwright install --with-deps chromium
RUN npm install
COPY / .
EXPOSE 3000
CMD [ "npm", "start"]