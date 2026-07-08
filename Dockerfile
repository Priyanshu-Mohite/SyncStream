# Node 20 LTS use kar rahe hain taaki mediasoup pre-built binary utha le
FROM node:20

WORKDIR /app

# Dependencies for any native modules
RUN apt-get update && apt-get install -y python3 python3-pip build-essential

# Sirf package.json files pehle copy kar rahe hain
COPY ./Backend/package*.json ./

# Ab npm install chalayenge. 
# Agar code change hota hai toh Docker is step ko wapas nahi chalayega, cache use karega.
RUN npm install

# Saara node_modules banne ke baad, baaki ka backend code copy hoga
COPY ./Backend .

CMD ["npm", "start"]