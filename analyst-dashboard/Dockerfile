# Build the React app
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
RUN npm run build

# Serve the static build
FROM nginx:1.27-alpine
# Rendered to conf.d/default.conf at start-up with ANALYST_API_KEY and API_UPSTREAM filled in
COPY --from=docker nginx.conf /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://api:8000
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
