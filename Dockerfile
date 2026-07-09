FROM node:22

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip build-essential

COPY ./Backend/package*.json ./

# --omit=dev karne se faltu testing packages install nahi honge, space bachegi
# --foreground-scripts se mediasoup ka output properly dikhega
RUN npm install --omit=dev --foreground-scripts

COPY ./Backend .

CMD ["npm", "start"]