#!/usr/bin/env python3
"""
Cloudflare Cleanup Script
Lists and cleans up Cloudflare Workers, Routes, Access policies, etc.
"""

import requests
import json

# Cloudflare API configuration
API_TOKEN = "REMOVED"
BASE_URL = "https://api.cloudflare.com/client/v4"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def get_account_id():
    """Get the first account ID"""
    response = requests.get(f"{BASE_URL}/accounts", headers=headers)
    if response.status_code == 200:
        accounts = response.json().get("result", [])
        if accounts:
            return accounts[0]["id"]
    return None

def list_workers(account_id):
    """List all Workers"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/workers/scripts", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_routes(account_id):
    """List all Worker Routes"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/workers/routes", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_zones(account_id):
    """List all zones"""
    response = requests.get(f"{BASE_URL}/zones", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_zone_routes(zone_id):
    """List zone-level routes"""
    response = requests.get(f"{BASE_URL}/zones/{zone_id}/workers/routes", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_access_policies(account_id):
    """List Access policies"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/access/apps", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_kv_namespaces(account_id):
    """List KV namespaces"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/storage/kv/namespaces", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_d1_databases(account_id):
    """List D1 databases"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/d1/database", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def list_pages_projects(account_id):
    """List Pages projects"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/pages/projects", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def delete_worker(account_id, script_name):
    """Delete a worker"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/workers/scripts/{script_name}", headers=headers)
    return response.status_code == 200

def delete_route(account_id, route_id):
    """Delete a route"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/workers/routes/{route_id}", headers=headers)
    return response.status_code == 200

def delete_zone_route(zone_id, route_id):
    """Delete a zone-level route"""
    response = requests.delete(f"{BASE_URL}/zones/{zone_id}/workers/routes/{route_id}", headers=headers)
    return response.status_code == 200

def delete_access_policy(account_id, policy_id):
    """Delete an access policy"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/access/apps/{policy_id}", headers=headers)
    return response.status_code == 200

def delete_kv_namespace(account_id, namespace_id):
    """Delete a KV namespace"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/storage/kv/namespaces/{namespace_id}", headers=headers)
    return response.status_code == 200

def delete_d1_database(account_id, database_id):
    """Delete a D1 database"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/d1/database/{database_id}", headers=headers)
    return response.status_code == 200

def main():
    print("=" * 80)
    print("CLOUDFLARE CLEANUP SCRIPT")
    print("=" * 80)
    print()

    # Get account ID
    print("Getting account ID...")
    account_id = get_account_id()
    if not account_id:
        print("ERROR: Could not get account ID!")
        return
    print(f"Account ID: {account_id}")
    print()

    # List Workers
    print("Listing Workers...")
    workers = list_workers(account_id)
    if workers:
        print(f"Found {len(workers)} worker(s):")
        for worker in workers:
            print(f"  - {worker.get('id', 'N/A')}")
    else:
        print("  No workers found")
    print()

    # List Routes
    print("Listing Account-Level Routes...")
    routes = list_routes(account_id)
    if routes:
        print(f"Found {len(routes)} route(s):")
        for route in routes:
            print(f"  - {route.get('pattern', 'N/A')} -> {route.get('script', 'N/A')}")
    else:
        print("  No account-level routes found")
    print()

    # List Zones and Zone Routes
    print("Listing Zones...")
    zones = list_zones(account_id)
    if zones:
        print(f"Found {len(zones)} zone(s):")
        for zone in zones:
            print(f"  - {zone.get('name', 'N/A')} (ID: {zone.get('id', 'N/A')})")

            # Get routes for this zone
            zone_routes = list_zone_routes(zone['id'])
            if zone_routes:
                print(f"    Routes for {zone['name']}:")
                for route in zone_routes:
                    print(f"      - {route.get('pattern', 'N/A')} -> {route.get('script', 'N/A')}")
    else:
        print("  No zones found")
    print()

    # List Access Policies
    print("Listing Access Policies...")
    policies = list_access_policies(account_id)
    if policies:
        print(f"Found {len(policies)} access policy/ies:")
        for policy in policies:
            print(f"  - {policy.get('name', 'N/A')} (ID: {policy.get('id', 'N/A')})")
    else:
        print("  No access policies found")
    print()

    # List KV Namespaces
    print("Listing KV Namespaces...")
    kv_namespaces = list_kv_namespaces(account_id)
    if kv_namespaces:
        print(f"Found {len(kv_namespaces)} KV namespace(s):")
        for ns in kv_namespaces:
            print(f"  - {ns.get('id', 'N/A')} ({ns.get('title', 'N/A')})")
    else:
        print("  No KV namespaces found")
    print()

    # List D1 Databases
    print("Listing D1 Databases...")
    d1_dbs = list_d1_databases(account_id)
    if d1_dbs:
        print(f"Found {len(d1_dbs)} D1 database(s):")
        for db in d1_dbs:
            print(f"  - {db.get('name', 'N/A')} (ID: {db.get('id', 'N/A')})")
    else:
        print("  No D1 databases found")
    print()

    # List Pages Projects
    print("Listing Pages Projects...")
    pages_projects = list_pages_projects(account_id)
    if pages_projects:
        print(f"Found {len(pages_projects)} Pages project(s):")
        for project in pages_projects:
            print(f"  - {project.get('name', 'N/A')} (ID: {project.get('id', 'N/A')})")
            print(f"    Production: {project.get('production_branch', 'N/A')}")
    else:
        print("  No Pages projects found")
    print()

    print("=" * 80)
    print("INVENTORY COMPLETE")
    print("=" * 80)
    print()
    print("Review the items above before proceeding with cleanup!")
    print()

if __name__ == "__main__":
    main()