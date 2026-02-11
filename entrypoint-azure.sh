#!/bin/sh
set -e

# Path to the SQLite database
# Note: In the Dockerfile, we will set up /pb/pb_data as the data directory
DB_PATH="/pb/pb_data/data.db"
LITESTREAM_CONFIG="/etc/litestream.yml"

# 1. Restore the database if it does not exist locally
if [ ! -f "$DB_PATH" ]; then
    echo "[Litestream] No local database found. Attempting to restore from Azure Blob Storage..."
    # -if-replica-exists prevents errors on the very first boot when the blob is empty
    # We use /usr/local/bin/litestream assuming that's where we install it
    litestream restore -if-replica-exists -config "$LITESTREAM_CONFIG" "$DB_PATH"
    echo "[Litestream] Restore complete."
else
    echo "[Litestream] Local database already exists. Skipping restore."
fi


# 2. Generate runtime config from environment variables (Frontend Requirement)
# This was originally in docker-entrypoint.sh
echo "[Frontend] Generating runtime config..."
# Ensure the directory exists
mkdir -p /pb/pb_public

cat <<EOF > /pb/pb_public/env-config.js
window._env_ = {
  ORG_NAME: "${ORG_NAME}",
  ORG_ABBR: "${ORG_ABBR}",
  MISSION_TITLE_PLACEHOLDER: "${MISSION_TITLE_PLACEHOLDER}",
  MISSION_LOCATION_PLACEHOLDER: "${MISSION_LOCATION_PLACEHOLDER}",
};
EOF
echo "[Frontend] runtime config generated at /pb/pb_public/env-config.js"


# 3. Start Litestream, which in turn executes PocketBase as a child process.
# Litestream will continuously replicate changes to Azure.
echo "[Litestream] Starting replication and launching PocketBase..."
# Note: Adjusted path to where PocketBase is likely installed in the final image (/usr/local/bin or /pb)
# Based on the plan, we are putting binaries in /usr/local/bin for standard path access
exec litestream replicate -config "$LITESTREAM_CONFIG" -exec "/usr/local/bin/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data"
