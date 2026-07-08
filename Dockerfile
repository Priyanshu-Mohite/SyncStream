FROM node:22

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip build-essential

COPY ./Backend .

RUN npm install

CMD ["npm", "start"]