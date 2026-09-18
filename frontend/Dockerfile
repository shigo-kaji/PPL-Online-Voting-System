# Build the Angular app
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve it with nginx, proxying /api to the backend container
FROM nginx:alpine
COPY --from=build /app/dist/online-voting-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80