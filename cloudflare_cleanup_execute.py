#!/usr/bin/env python3
"""
Cloudflare Cleanup Script - EXECUTE
Deletes unnecessary Workers, Routes, and resources
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

# Account ID from inventory
ACCOUNT_ID = "049ff5e84ecf636b53b162cbb580aae6"

# Zone ID for superinstance.ai
SUPERINSTANCE_ZONE_ID = "ad3dafbffe950169ed1b4d465950fa66"

# Resources to KEEP
KEEP_WORKERS = {"spreadsheet-moment"}
KEEP_D1_DBS = {"spreadsheet-moment-db-dev", "spreadsheet-moment-db-prod"}
KEEP_PAGES_PROJECTS = {"spreadsheet-moment", "luciddreamer-ai", "lucineer-com", "superinstance-ai", "makerlog-dashboard"}
KEEP_KV_NAMESPACES = {}  # Delete all KV namespaces
KEEP_ACCESS_POLICIES = {}  # Delete all Access policies

def delete_worker(account_id, script_name):
    """Delete a worker"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/workers/scripts/{script_name}", headers=headers)
    if response.status_code == 200:
        print(f"  Deleted worker: {script_name}")
        return True
    else:
        print(f"  Failed to delete worker: {script_name} ({response.status_code})")
        return False

def delete_zone_route(zone_id, route_id):
    """Delete a zone-level route"""
    response = requests.delete(f"{BASE_URL}/zones/{zone_id}/workers/routes/{route_id}", headers=headers)
    if response.status_code == 200:
        print(f"  Deleted zone route: {route_id}")
        return True
    else:
        print(f"  Failed to delete zone route: {route_id} ({response.status_code})")
        return False

def delete_access_policy(account_id, policy_id):
    """Delete an access policy"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/access/apps/{policy_id}", headers=headers)
    if response.status_code == 200:
        print(f"  Deleted access policy: {policy_id}")
        return True
    else:
        print(f"  Failed to delete access policy: {policy_id} ({response.status_code})")
        return False

def delete_kv_namespace(account_id, namespace_id):
    """Delete a KV namespace"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/storage/kv/namespaces/{namespace_id}", headers=headers)
    if response.status_code == 200:
        print(f"  Deleted KV namespace: {namespace_id}")
        return True
    else:
        print(f"  Failed to delete KV namespace: {namespace_id} ({response.status_code})")
        return False

def delete_d1_database(account_id, database_id):
    """Delete a D1 database"""
    response = requests.delete(f"{BASE_URL}/accounts/{account_id}/d1/database/{database_id}", headers=headers)
    if response.status_code == 200:
        print(f"  Deleted D1 database: {database_id}")
        return True
    else:
        print(f"  Failed to delete D1 database: {database_id} ({response.status_code})")
        return False

def get_all_workers(account_id):
    """Get all workers"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/workers/scripts", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def get_zone_routes(zone_id):
    """Get zone-level routes"""
    response = requests.get(f"{BASE_URL}/zones/{zone_id}/workers/routes", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def get_access_policies(account_id):
    """Get access policies"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/access/apps", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def get_kv_namespaces(account_id):
    """Get KV namespaces"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/storage/kv/namespaces", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def get_d1_databases(account_id):
    """Get D1 databases"""
    response = requests.get(f"{BASE_URL}/accounts/{account_id}/d1/database", headers=headers)
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def main():
    print("=" * 80)
    print("CLOUDFLARE CLEANUP - EXECUTING")
    print("=" * 80)
    print()

    # Step 1: Delete problematic zone routes on superinstance.ai
    print("Step 1: Deleting problematic zone routes on superinstance.ai...")
    print("  This is causing the popup on spreadsheet.superinstance.ai!")
    zone_routes = get_zone_routes(SUPERINSTANCE_ZONE_ID)
    for route in zone_routes:
        route_id = route.get('id')
        pattern = route.get('pattern')
        script = route.get('script')
        print(f"  Found route: {pattern} -> {script}")
        delete_zone_route(SUPERINSTANCE_ZONE_ID, route_id)
    print()

    # Step 2: Delete unnecessary workers
    print("Step 2: Deleting unnecessary workers...")
    workers = get_all_workers(ACCOUNT_ID)
    deleted_count = 0
    for worker in workers:
        worker_name = worker.get('id')
        if worker_name not in KEEP_WORKERS:
            if delete_worker(ACCOUNT_ID, worker_name):
                deleted_count += 1
    print(f"  Deleted {deleted_count} workers")
    print(f"  Kept: {', '.join(KEEP_WORKERS)}")
    print()

    # Step 3: Delete access policies
    print("Step 3: Deleting Access policies...")
    policies = get_access_policies(ACCOUNT_ID)
    for policy in policies:
        policy_id = policy.get('id')
        policy_name = policy.get('name')
        print(f"  Found policy: {policy_name}")
        if policy_id not in KEEP_ACCESS_POLICIES:
            delete_access_policy(ACCOUNT_ID, policy_id)
    print()

    # Step 4: Delete KV namespaces
    print("Step 4: Deleting KV namespaces...")
    kv_namespaces = get_kv_namespaces(ACCOUNT_ID)
    for ns in kv_namespaces:
        ns_id = ns.get('id')
        ns_title = ns.get('title')
        print(f"  Found KV: {ns_title}")
        if ns_id not in KEEP_KV_NAMESPACES:
            delete_kv_namespace(ACCOUNT_ID, ns_id)
    print()

    # Step 5: Delete unnecessary D1 databases
    print("Step 5: Deleting unnecessary D1 databases...")
    d1_dbs = get_d1_databases(ACCOUNT_ID)
    for db in d1_dbs:
        db_name = db.get('name')
        db_id = db.get('uuid')
        print(f"  Found D1: {db_name}")
        if db_name not in KEEP_D1_DBS:
            if db_id:
                delete_d1_database(ACCOUNT_ID, db_id)
    print(f"  Kept: {', '.join(KEEP_D1_DBS)}")
    print()

    print("=" * 80)
    print("CLEANUP COMPLETE!")
    print("=" * 80)
    print()
    print("What was deleted:")
    print("  - Problematic routes on superinstance.ai (fixing the popup)")
    print("  - Unnecessary workers (kept only spreadsheet-moment)")
    print("  - Access policies")
    print("  - KV namespaces")
    print("  - Unnecessary D1 databases")
    print()
    print("What was kept:")
    print(f"  - Workers: {', '.join(KEEP_WORKERS)}")
    print(f"  - D1 DBs: {', '.join(KEEP_D1_DBS)}")
    print(f"  - Pages projects: {', '.join(KEEP_PAGES_PROJECTS)}")
    print()
    print("Next: Test https://spreadsheet.superinstance.ai")
    print()

if __name__ == "__main__":
    main()