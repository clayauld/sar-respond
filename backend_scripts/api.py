from flask import Flask, request, jsonify
from flask_cors import CORS
from caltopo_service import CalTopoService
import os
import sys
import requests

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

def check_auth(token):
    """
    Verifies the token against the PocketBase instance.
    Returns the user data if valid, None otherwise.
    """
    try:
        # Internal URL for PocketBase within the Docker network
        # Since 'caddy' maps 8090:80 but 'rescue-respond' usually runs on 8090 internally
        # We try to hit the container directly.
        # Based on docker-compose, 'rescue-respond' is the service name.
        pb_url = "http://rescue-respond:8090/api/collections/users/auth-refresh"
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.post(pb_url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f"Auth check failed: {e}", file=sys.stderr)
        return None

@app.route('/create-map', methods=['POST'])
def create_map():
    # 1. Auth Check
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or malformed Authorization header"}), 401
    
    token = auth_header.split(" ", 1)[1]
    user_data = check_auth(token)
    
    if not user_data:
        return jsonify({"error": "Invalid or expired token"}), 401

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
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
