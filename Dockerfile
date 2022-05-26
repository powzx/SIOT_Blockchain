FROM node:12
WORKDIR /usr/src/app
ENV VALIDATOR_NUM=
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 4004
CMD [ "node", "families/demo-js/index.js" ]