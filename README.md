# SAR Response System

A specialized response coordination system for rescue and response teams (mountain rescue, avalanche rescue, and other SAR organizations). This application allows responders to view active missions, set their status (responding/standby), and provides admins with a live dashboard of responding resources.

## System Overview

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: PocketBase (Go-based realtime backend)
- **Deployment**: Docker / Docker Compose

## Prerequisites

- **Make**: For running unified commands.
- **Node.js**: v18+ (for local development).
- **Docker & Docker Compose**: (for containerized deployment).

## Quick Start (Docker)

The easiest way to run the system is with Docker. This will stand up both the frontend and backend in a single container.

1.  **Start the system**:
    ```bash
    make docker-up
    ```
2.  **Access the application**:
    - App: [http://localhost:8090](http://localhost:8090)
    - Admin UI: [http://localhost:8090/\_/](http://localhost:8090/_/)

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

### 2. Run Backend

Start the PocketBase server. This utilizes the `pb_migrations` directory to automatically configure the database schema.

```bash
make serve-pb
```

_Keep this terminal running._

### 3. Run Frontend

In a new terminal window, start the React dev server:

```bash
make dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend/API**: [http://localhost:8090](http://localhost:8090)

The frontend is configured to proxy API requests to port 8090 (defined in `vite.config.js`), so authentication and data fetching will work seamlessly.

## Database & Admin Setup

The system comes with `pb_migrations` which will automatically create the necessary Collections (`missions`, `responses`) and update the `users` collection when PocketBase starts for the first time.

### First Time Admin Login

1.  Go to [http://localhost:8090/\_/](http://localhost:8090/_/)
2.  Create your first Admin account (email/password).
3.  Use this account to manage users (the "Roster") and Missions.
4.  **Importing Members**: You can import members using a **CSV** file or a **D4H Contact List PDF**.
    - For PDFs, the system automatically parses "Operational--Field", "Operational--Base Only", and "Prospective" categories.

### Default Responder Login

- **Username**: Member ID (e.g., `304`)
- **Password**: Member ID (by default) - _Change this in production!_

## Building for Production

To create a production build of the frontend:

```bash
make build
```

The output will be in the `dist/` directory.

To rebuild the Docker image (which includes the new frontend build):

```bash
make docker-build
make docker-up
```

## Testing

Currently, the project utilizes ESLint for code quality checks.

```bash
make test
```

## Project Structure

- `src/`: React application source code.
- `pb_migrations/`: Database schema definitions (JS migrations).
- `docker-compose.yml`: Production orchestration config.
- `vite.config.js`: Frontend build and proxy configuration.
