FROM node:22

WORKDIR /app

COPY ./Backend .

RUN npm install

CMD ["npm", "start"]