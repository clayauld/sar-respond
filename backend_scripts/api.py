from flask import Flask, request, jsonify
from flask_cors import CORS
from caltopo_service import CalTopoService
import os
import sys

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

@app.route('/create-map', methods=['POST'])
def create_map():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON payload provided"}), 400

    title = data.get('title')
    location = data.get('location')
    lkp = data.get('lkp') # Expecting [lat, lon] or null

    if not title:
        return jsonify({"error": "Missing 'title' field"}), 400

    print(f"Received request to create map: {title} at {location} with LKP: {lkp}")

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
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
