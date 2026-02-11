# Stage 1: Build the React Application
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install -g npm@11.8.0 && npm install
COPY . .
RUN npm run build

# Stage 2: Setup PocketBase
FROM alpine:latest

ARG PB_VERSION=0.22.21

# Install dependencies needed to download PocketBase
RUN apk add --no-cache \
    unzip \
    ca-certificates \
    wget

# Download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/

# Copy the built React app from Stage 1 into PocketBase's public directory
COPY --from=frontend-builder /app/dist /pb/pb_public

# Copy migrations so they are baked into the image
COPY pb_migrations /pb/pb_migrations

# Create a volume for persistent data
VOLUME /pb/pb_data

# Copy and set entrypoint
COPY entrypoint-docker.sh /pb/entrypoint.sh
RUN chmod +x /pb/entrypoint.sh

EXPOSE 8090

# Entrypoint handles startup
ENTRYPOINT ["/pb/entrypoint.sh"]
