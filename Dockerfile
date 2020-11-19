FROM keymetrics/pm2:12-jessie
WORKDIR /usr/share/nginx/html/faldax-nodejs
COPY package*.json ./
RUN npm install
RUN npm rebuild
EXPOSE 8084
COPY . .
COPY .env .env
CMD [ "pm2-runtime", "start", "app.js" ]
