FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --quiet
COPY . .

EXPOSE 4000

CMD ["node", "src/index.js"]
