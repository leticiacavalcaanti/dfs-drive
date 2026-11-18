FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# CONTROLLER_URL é lido em tempo de execução pelas rotas de servidor (o navegador nunca fala com o controlador nem com os nós).
ENV CONTROLLER_URL=http://controller:9000
CMD ["npm", "start"]
