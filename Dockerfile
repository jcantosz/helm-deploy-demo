FROM node:8.12.0-jessie

EXPOSE 3000

USER node
WORKDIR /home/node

COPY . ./
RUN npm install 

CMD ["npm", "start"]
