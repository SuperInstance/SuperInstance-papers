#!/usr/bin/env python3
"""
Delete Access Policies via Zero Trust API
"""

import requests

API_TOKEN = "REMOVED"
ACCOUNT_ID = "049ff5e84ecf636b53b162cbb580aae6"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Access policy IDs from inventory
POLICY_1 = "83387ecb-25f6-4dd6-a9c2-112b2cca33b1"
POLICY_2 = "72cadf79-b6dd-456b-9f68-66a5e6fcbd0a"

print("Attempting to delete Access policies...")

# Try Zero Trust API endpoint
for policy_id, name in [(POLICY_1, "lucineer"), (POLICY_2, "Warp Login App")]:
    print(f"Deleting policy: {name} ({policy_id})")

    # Method 1: Try Access Apps API
    response = requests.delete(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/access/apps/{policy_id}",
        headers=headers
    )
    print(f"  Method 1 (Access Apps): {response.status_code}")

    if response.status_code != 200:
        # Method 2: Try Zero Trust API
        response = requests.delete(
            f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/zero-trust/access/apps/{policy_id}",
            headers=headers
        )
        print(f"  Method 2 (Zero Trust): {response.status_code}")

        if response.status_code != 200:
            print(f"  Response: {response.text[:200]}")

print("\nAccess policies may need manual deletion via Cloudflare Dashboard")
print("Go to: https://dash.cloudflare.com → Zero Trust → Access → Applications")