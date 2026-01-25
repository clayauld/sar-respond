# Stage 1: Build the React Application
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
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

# Create a volume for persistent data
VOLUME /pb/pb_data

EXPOSE 8090

# Start PocketBase and instruct it to listen on all interfaces
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
