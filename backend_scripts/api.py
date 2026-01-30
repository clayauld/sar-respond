from flask import Flask, request, jsonify
from caltopo_service import CalTopoService
import os
import sys
import requests
from functools import wraps
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
# Enable ProxyFix to trust headers from Caddy (X-Forwarded-For, etc)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://")
)

# Configuration
# Default to Docker internal hostname if not set
PB_INTERNAL_URL = os.getenv("PB_INTERNAL_URL", "http://rescue-respond:8090")

def check_auth(token):
    """
    Verifies the token with PocketBase and returns the user data if valid.
    Expects token to be 'Bearer <token>'.
    """
    try:
        headers = {"Authorization": token}
        # Use a lightweight endpoint to check auth. 'auth-refresh' works.
        # This endpoint returns 200 if token is valid, 401/404 if not.
        resp = requests.post(f"{PB_INTERNAL_URL}/api/collections/users/auth-refresh", headers=headers, timeout=5)
        if resp.status_code == 200:
            return resp.json() # Returns { token: ..., record: { ... } }
        return None
    except Exception as e:
        print(f"Auth check failed: {e}", file=sys.stderr)
        return None

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Missing Authorization Header"}), 401

        user_data = check_auth(auth_header)

        if not user_data:
            return jsonify({"error": "Invalid Token or Authentication Failed"}), 401

        # Check role
        user_record = user_data.get("record", {})
        if user_record.get("role") != "Admin":
            return jsonify({"error": "Forbidden: Admin Access Required"}), 403

        # Store user info in request context if needed, or just proceed
        # For now, we print in the route, so we might want to attach it to request
        request.user_data = user_data

        return f(*args, **kwargs)
    return decorated_function

@app.route('/create-map', methods=['POST'])
@limiter.limit("5 per minute")
@require_admin
def create_map():
    # User is already authenticated via @require_admin
    user_data = getattr(request, 'user_data', {})

    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400

    title = data.get('title')
    location = data.get('location')
    lkp = data.get('lkp') # Expecting [lat, lon] or null

    if not title:
        return jsonify({"error": "Missing 'title' field"}), 400

    # Log the authenticated user
    user_id = user_data.get('record', {}).get('id', 'unknown')
    user_email = user_data.get('record', {}).get('email', 'unknown')
    print(f"Received request from {user_email} ({user_id}) to create map: {title} at {location} with LKP: {lkp}")

    try:
        service = CalTopoService()
        
        # Prepare LKP coordinates
        # Frontend sends [lat, lon], GeoJSON expects [lon, lat]
        lkp_coords = None
        if lkp and isinstance(lkp, list) and len(lkp) == 2:
            lat, lon = lkp
            lkp_coords = [float(lon), float(lat)]
            
        # Prepare ICP coordinates
        icp = data.get('icp')
        icp_coords = None
        if icp and isinstance(icp, list) and len(icp) == 2:
            lat, lon = icp
            icp_coords = [float(lon), float(lat)]
        
        map_id = service.create_mission_map(title, lkp_coords=lkp_coords, icp_coords=icp_coords)
        map_url = service.get_map_url(map_id)
        
        return jsonify({
            "success": True,
            "map_id": map_id,
            "map_url": map_url
        })

    except Exception as e:
        print(f"Error creating map: {e}", file=sys.stderr)
        return jsonify({"error": "An internal error occurred while creating the map."}), 500

@app.route('/health', methods=['GET'])
@limiter.exempt
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
