#!/usr/bin/env python3
"""
Setup custom domain for spreadsheet-moment Pages
"""

import requests
import time

API_TOKEN = "REMOVED"
ACCOUNT_ID = "049ff5e84ecf636b53b162cbb580aae6"
PROJECT_NAME = "spreadsheet-moment"
CUSTOM_DOMAIN = "spreadsheet.superinstance.ai"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def get_pages_projects():
    """Get Pages projects"""
    response = requests.get(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects",
        headers=headers
    )
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

def add_custom_domain(project_name, domain):
    """Add custom domain to Pages project"""
    data = {
        "name": domain,
        "production_branch": "main"
    }

    response = requests.post(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{project_name}/domains",
        headers=headers,
        json=data
    )

    return response

def get_project_domains(project_name):
    """Get domains for a project"""
    response = requests.get(
        f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{project_name}/domains",
        headers=headers
    )
    if response.status_code == 200:
        return response.json().get("result", [])
    return []

print("Setting up custom domain for spreadsheet-moment...")

# Get current domains
print("Current domains:")
domains = get_project_domains(PROJECT_NAME)
for domain in domains:
    print(f"  - {domain.get('name')} (status: {domain.get('status')})")

# Add custom domain
print(f"\nAdding custom domain: {CUSTOM_DOMAIN}")
response = add_custom_domain(PROJECT_NAME, CUSTOM_DOMAIN)

if response.status_code == 200:
    result = response.json().get("result", {})
    print(f"Success! Domain added.")
    print(f"Name: {result.get('name')}")
    print(f"Status: {result.get('status')}")
    print(f"\nDNS Records to add:")
    print(f"Type: CNAME")
    print(f"Name: {CUSTOM_DOMAIN}")
    print(f"Target: spreadsheet-moment.pages.dev")
    print(f"Proxy: Proxied (Orange cloud)")
else:
    print(f"Failed: {response.status_code}")
    print(f"Response: {response.text[:500]}")

print("\nWaiting for DNS to propagate...")
print("Test https://spreadsheet.superinstance.ai in a few minutes!")