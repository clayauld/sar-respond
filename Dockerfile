# Stage 1: Build the React Application
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@11.8.0 && npm install
COPY . .
RUN npm run build

# Stage 2: Setup PocketBase
FROM alpine:3.19

# Install dependencies needed to download PocketBase
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget \
    bash \
    curl

ARG PB_VERSION=0.22.21

# Download and unzip PocketBase
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip -d /pb

# Move binary to standard location
RUN mv /pb/pocketbase /usr/local/bin/pocketbase \
    && chmod +x /usr/local/bin/pocketbase

# Create standard PocketBase directory structure
RUN mkdir -p /pb/pb_data /pb/pb_public /pb/pb_migrations

# Copy the built React app from Stage 1 into PocketBase's public directory
COPY --from=frontend-builder /app/dist /pb/pb_public

# Copy migrations so they are baked into the image
COPY pb_migrations /pb/pb_migrations

# Copy and set entrypoint
COPY entrypoint-docker.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8090

# Entrypoint handles startup
CMD ["/entrypoint.sh"]
