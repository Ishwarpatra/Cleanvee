# Build stage
FROM node:22.13.0-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && test -s dist/index.html

# Production stage
FROM nginx:1.27.1-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV PORT=8080
EXPOSE 8080
# The official Nginx entrypoint expands $PORT in templates before startup.
CMD ["nginx", "-g", "daemon off;"]
