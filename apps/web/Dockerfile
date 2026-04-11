FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install

COPY . .
RUN rm -f next.config.ts

EXPOSE 3000

CMD ["npm", "run", "dev"]
