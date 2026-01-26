#!/bin/sh

# Generate runtime config from environment variables
echo "Generating runtime config..."
cat <<EOF > /pb/pb_public/env-config.js
window._env_ = {
  ORG_NAME: "${ORG_NAME}",
  ORG_ABBR: "${ORG_ABBR}",
  MISSION_TITLE_PLACEHOLDER: "${MISSION_TITLE_PLACEHOLDER}",
  MISSION_LOCATION_PLACEHOLDER: "${MISSION_LOCATION_PLACEHOLDER}",
};
EOF

# Start PocketBase
echo "Starting PocketBase..."
exec /pb/pocketbase serve --http=0.0.0.0:8090
