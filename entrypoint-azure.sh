#!/bin/sh
set -e

# --- Configuration ---
DB_PATH="/pb/pb_data/data.db"
LITESTREAM_CONFIG="/etc/litestream.yml"

# --- 1. Environment Setup ---

# # Map Container App secret to expected variable if needed
# if [ -z "$AZURE_STORAGE_KEY" ] && [ -n "$LITESTREAM_AZURE_ACCOUNT_KEY" ]; then
#     export AZURE_STORAGE_KEY="$LITESTREAM_AZURE_ACCOUNT_KEY"
# fi

# # Sanitize credentials (remove whitespace)
# export AZURE_STORAGE_KEY=$(echo "$AZURE_STORAGE_KEY" | tr -d '[:space:]')
# export AZURE_STORAGE_ACCOUNT=$(echo "$AZURE_STORAGE_ACCOUNT" | tr -d '[:space:]')

# # --- 2. Generate Litestream Config ---
# echo "[Entrypoint] Generating Litestream configuration..."
# cat <<EOF > "$LITESTREAM_CONFIG"
# dbs:
#   - path: $DB_PATH
#     replicas:
#       - type: abs
#         endpoint: https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net
#         bucket: ${AZURE_STORAGE_CONTAINER}
#         account-name: "${AZURE_STORAGE_ACCOUNT}"
#         account-key: "${AZURE_STORAGE_KEY}"
#         path: pb_data.db
#         validation-interval: "1h"
# EOF

# --- 1. Connectivity Check ---
echo "[Entrypoint] Verifying connectivity to Azure Blob Storage..."
if curl -I -m 5 "https://${AZURE_STORAGE_ACCOUNT}.blob.core.windows.net"; then
    echo "[Entrypoint] Connection successful."
else
    echo "[Entrypoint] WARNING: Connection check failed. Check DNS or Networking."
fi

# --- 2. Database Restoration ---
if [ ! -f "$DB_PATH" ]; then
    echo "[Entrypoint] No local database found. Attempting restore..."
    # -if-replica-exists prevents errors on first boot
    litestream restore -if-replica-exists -config "$LITESTREAM_CONFIG" "$DB_PATH"
    echo "[Entrypoint] Restore complete."
else
    echo "[Entrypoint] Local database found. Skipping restore."
fi

# --- 3. Frontend Configuration ---
echo "[Entrypoint] Generating frontend runtime config..."
mkdir -p /pb/pb_public
cat <<EOF > /pb/pb_public/env-config.js
window._env_ = {
  ORG_NAME: "${ORG_NAME}",
  ORG_ABBR: "${ORG_ABBR}",
  MISSION_TITLE_PLACEHOLDER: "${MISSION_TITLE_PLACEHOLDER}",
  MISSION_LOCATION_PLACEHOLDER: "${MISSION_LOCATION_PLACEHOLDER}",
};
EOF

# --- 4. Start Application ---
echo "[Entrypoint] Starting Litestream replication and PocketBase..."
exec litestream replicate -config "$LITESTREAM_CONFIG" -exec "/usr/local/bin/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --publicDir=/pb/pb_public"