FROM node:22-alpine

WORKDIR /app

COPY ./Backend .

RUN npm install

CMD ["npm", "start"]