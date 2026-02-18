# Estágio 1: build da aplicação React
FROM node:20-alpine AS builder

WORKDIR /app

# Variável de build: URL da API (o browser usa esta URL para chamar o backend)
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

# Estágio 2: servir com nginx (imagem final leve)
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
