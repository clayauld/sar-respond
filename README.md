# SAR Response System

A specialized response coordination system for rescue and response teams (mountain rescue, avalanche rescue, and other SAR organizations). This application allows responders to view active missions, set their status (responding/standby), and provides admins with a live dashboard of responding resources.

## System Overview

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: PocketBase (Go-based realtime backend)
- **Integration**: Automated CalTopo Mission Map creation
- **Infrastructure**: Docker Compose + Caddy Reverse Proxy

## Instant Deployment (One-Shot)

If you just want to run the system without cloning the entire repository, run this single command in your terminal:

```bash
mkdir sar-respond && cd sar-respond && \
curl -O https://raw.githubusercontent.com/clayauld/sar-respond/main/docker-compose.yml \
     -O https://raw.githubusercontent.com/clayauld/sar-respond/main/Caddyfile \
     -o .env https://raw.githubusercontent.com/clayauld/sar-respond/main/.env.example && \
docker compose up -d
```

This will download the necessary configuration files and start the latest production containers.

**Important**: You should edit the `.env` file after downloading to set your Organization Name and CalTopo credentials.

## Quick Start (Cloned Repo)

If you have cloned this repository, use the following steps to start the system using Docker.

1.  **Configure Environment**:

    Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` to configure:
    - `ORG_NAME`: Your organization's name.
    - `CALTOPO_CRED_ID/SECRET`: Credentials for CalTopo API integration.
    - `CALTOPO_TEAM_ID`: The Team ID where maps should be created.

2.  **Start the system**:

    ```bash
    make docker-up
    ```

    _(This runs `docker compose up -d`)_

3.  **Access the application**:
    - **App**: [http://localhost:8090](http://localhost:8090) (Proxied via Caddy)
    - **PocketBase Admin**: [http://localhost:8090/\_/](http://localhost:8090/_/)

To stop the system:

```bash
make docker-down
```

## Local Development (Without Docker)

For developing the frontend code, you can run the components separately.

### 1. Setup

Install dependencies and download the PocketBase backend binary:

```bash
make install
make setup-local
```

### 2. Run Backend (PocketBase)

Start the PocketBase server. This utilizes the `pb_migrations` directory to automatically configure the database schema.

```bash
make serve-pb
```

- **URL**: [http://localhost:8090](http://localhost:8090)

### 3. Run Backend (Python API)

Start the CalTopo integration service.

```bash
# Install Python dependencies
pip install -r backend_scripts/requirements.txt

# Run the API
python3 backend_scripts/api.py
```

- **URL**: [http://localhost:5000](http://localhost:5000)

_Note: The frontend allows proxying to this service, but defaults to the Docker hostname `caltopo-api`. You may need to adjust `vite.config.js` or your hosts file for local development._

### 4. Run Frontend

In a new terminal window, start the React dev server:

```bash
make dev
```

- **URL**: [http://localhost:5173](http://localhost:5173)

## Database & Admin Setup

The system comes with `pb_migrations` which will automatically create the necessary Collections (`missions`, `responses`) and update the `users` collection when PocketBase starts for the first time.

### First Time Admin Login

1.  Go to [http://localhost:8090/\_/](http://localhost:8090/_/)
2.  Create your first Admin account (email/password).
3.  Use this account to manage users (the "Roster") and Missions.
4.  **Importing Members**: You can import members using a **CSV** file.

### Default Responder Login

- **Username**: Member ID (e.g., `304`)
- **Password**: Member ID (by default) - _Change this in production!_

## Releasing New Versions

To build and push new Docker images for production:

1.  **Bump Version**: Update the version number in `package.json`.
2.  **Release**:
    ```bash
    make docker-release
    ```

This will:

1. Build the frontend (`npm run build`).
2. Build new Docker images (`rescue-respond` and `caltopo-api`) tagged with the version and `latest`.
3. Push them to the GitHub Container Registry.

## Testing

Currently, the project utilizes ESLint for code quality checks.

```bash
make test
```

## Project Structure

- `src/`: React application source code.
- `backend_scripts/`: Python API for CalTopo integration.
- `pb_migrations/`: Database schema definitions (JS migrations).
- `docker-compose.yml`: Production orchestration config.
- `Caddyfile`: Reverse proxy configuration.
- `vite.config.js`: Frontend build and proxy configuration.
