import time
import json
import hmac
import hashlib
import requests
import base64
import os
from dotenv import load_dotenv
from urllib.parse import urlencode

# Load environment variables from .env file
load_dotenv()

class CalTopoService:
    def __init__(self):
        self.cred_id = os.getenv("CALTOPO_CRED_ID")
        self.cred_secret = os.getenv("CALTOPO_CRED_SECRET")
        self.target_team_id = os.getenv("CALTOPO_TEAM_ID")
        self.template_map_id = os.getenv("CALTOPO_TEMPLATE_MAP_ID")

        if not all([self.cred_id, self.cred_secret, self.target_team_id]):
            raise ValueError("Missing required environment variables. Please check .env file.")

    def _sign(self, method, endpoint, expires, payload_str):
        """
        Generates HMAC-SHA256 signature based on official docs.
        """
        message = f"{method} {endpoint}\n{expires}\n{payload_str}"
        
        # Secret is base64 decoded
        try:
            secret = base64.b64decode(self.cred_secret)
        except Exception as e:
            raise ValueError(f"Invalid Base64 Secret: {e}")

        signature = hmac.new(
            secret,
            message.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        return base64.b64encode(signature).decode('utf-8')

    def _send_request(self, method, endpoint, payload=None):
        """
        Sends authenticated request.
        endpoint should start with /api/v1/...
        """
        expires = int(time.time() * 1000) + (5 * 60 * 1000)
        payload_str = json.dumps(payload) if payload else ""
        
        signature = self._sign(method, endpoint, expires, payload_str)
        
        params = {
            "id": self.cred_id,
            "expires": str(expires),
            "signature": signature
        }
        
        # Ensure endpoint starts with /
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
            
        url = f"https://caltopo.com{endpoint}"

        if method == "POST":
            if payload:
                params["json"] = payload_str
            
            headers = {"Content-Type": "application/x-www-form-urlencoded"}
            response = requests.post(url, data=params, headers=headers, timeout=20)
        
        elif method == "GET":
            response = requests.get(url, params=params, timeout=15)
            
        else:
            raise NotImplementedError(f"Method {method} not implemented")

        if not response.ok:
            print(f"Request failed: {response.status_code} {response.text}")
            
        response.raise_for_status()
        return response.json()

    def get_template_geojson(self):
        """
        Fetches the state of the template map.
        """
        if not self.template_map_id:
            print("Warning: CALTOPO_TEMPLATE_MAP_ID not set. Using empty state.")
            return {"features": []}

        # The docs say endpoint is the URL part *after* https://caltopo.com
        full_endpoint = f"/api/v1/map/{self.template_map_id}/since/0"
        result = self._send_request("GET", full_endpoint)
        return result['result']['state']

    def create_mission_map(self, mission_name, lkp_coords=None):
        """
        Orchestrates the creation of a new mission map.
        """
        print(f"Creating map: {mission_name}...")
        
        # Step 1: Fetch Template
        try:
            geo_state = self.get_template_geojson()
            # Sanitize
            if 'features' in geo_state:
                for feature in geo_state['features']:
                    feature.pop('id', None)
                    feature.pop('folderId', None)
        except Exception as e:
            print(f"Failed to fetch template: {e}")
            geo_state = {"features": []}

        # Step 2: Inject LKP
        if lkp_coords:
            lkp_feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": lkp_coords
                },
                "properties": {
                    "title": "LKP",
                    "description": "Last Known Point",
                    "marker-symbol": "star",
                    "marker-color": "FF0000"
                }
            }
            geo_state.setdefault('features', []).append(lkp_feature)

        # Step 3: Payload
        payload = {
            "properties": {
                "title": mission_name,
                "mode": "sar",
                "sharing": "SECRET",
                "mapConfig": json.dumps({"activeLayers": [["mbt", 1]]}) 
            },
            "state": geo_state
        }
        
        # Step 4: Execute
        # Endpoint: /api/v1/acct/{team_id}/CollaborativeMap
        full_endpoint = f"/api/v1/acct/{self.target_team_id}/CollaborativeMap"
        
        result = self._send_request("POST", full_endpoint, payload)
        
        map_id = result['result']['id']
        print(f"Success! Map ID: {map_id}")
        return map_id
    
    def get_map_url(self, map_id):
        return f"https://caltopo.com/m/{map_id}"
