# AMRG Rescue Respond System Makefile

PB_VERSION := 0.22.21
PB_FILE := pocketbase_$(PB_VERSION)_linux_amd64.zip
PB_URL := https://github.com/pocketbase/pocketbase/releases/download/v$(PB_VERSION)/$(PB_FILE)

.PHONY: help install dev build lint test clean docker-up docker-down docker-build setup-local serve-pb

help:
	@echo "Available commands:"
	@echo "  make install       - Install Node dependencies"
	@echo "  make setup-local   - Download and setup PocketBase locally"
	@echo "  make dev           - Run the frontend in development mode"
	@echo "  make serve-pb      - Run the local PocketBase backend"
	@echo "  make build         - Build the frontend for production"
	@echo "  make lint          - Run linting checks"
	@echo "  make test          - Run tests (currently lint only)"
	@echo "  make docker-up     - Start the system with Docker"
	@echo "  make docker-down   - Stop Docker containers"
	@echo "  make docker-build  - Rebuild Docker images"
	@echo "  make clean         - Remove build artifacts and dependencies"

install:
	npm install

setup-local:
	@if [ ! -f pb_server ]; then \
		echo "Downloading PocketBase $(PB_VERSION)..."; \
		wget -O /tmp/pb.zip $(PB_URL); \
		unzip -o /tmp/pb.zip pocketbase; \
		mv pocketbase pb_server; \
		rm /tmp/pb.zip; \
		chmod +x pb_server; \
		echo "PocketBase installed as pb_server."; \
	else \
		echo "PocketBase (pb_server) already exists."; \
	fi

dev:
	@echo "Starting development server..."
	rm -rf node_modules/.vite
	npm run dev

serve-pb:
	./pb_server serve --http=127.0.0.1:8090

build:
	npm run build

lint:
	npm run lint

test: lint

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

clean:
	rm -rf dist node_modules pb_server
