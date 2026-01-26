import sys
import os
from caltopo_service import CalTopoService

def run_test():
    print("Initializing CalTopo Service...")
    try:
        service = CalTopoService()
        print("Service initialized successfully.")
    except ValueError as e:
        print(f"Initialization Failed: {e}")
        return

    print("\n--- Test 1: Fetching Template Map ---")
    try:
        if not service.template_map_id:
            print("Skipping template fetch (no ID provided in .env)")
        else:
            state = service.get_template_geojson()
            feature_count = len(state.get('features', []))
            print(f"Success! Fetched template with {feature_count} features.")
    except Exception as e:
        print(f"Test 1 Failed: {e}")
        # Continue to next test? Maybe, but creation might fail if fetch failed due to auth.

    print("\n--- Test 2: Creating New Mission Map ---")
    mission_name = "TEST MISSION - AUTOMATED CREATION"
    # Example LKP: Point in Yosemite (approx)
    lkp = [-119.5, 37.75] 

    try:
        map_id = service.create_mission_map(mission_name, lkp_coords=lkp)
        url = service.get_map_url(map_id)
        print(f"\n[SUCCESS] Map Created!")
        print(f"Map ID: {map_id}")
        print(f"URL: {url}")
        print("\nPlease click the URL to verify the map was created with the template data and an LKP marker.")
    except Exception as e:
        print(f"Test 2 Failed: {e}")

if __name__ == "__main__":
    run_test()
