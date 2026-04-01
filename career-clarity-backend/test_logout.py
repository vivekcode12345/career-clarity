import requests
import json

BASE_URL = "http://localhost:8000/api"

# Register a test user
print("1. Testing Registration...")
register_data = {
    "username": "logout_test_" + str(__import__('time').time()).split('.')[0],
    "password": "testpass123",
    "name": "Logout Tester",
    "email": "logout_test@example.com",
    "educationLevel": "Graduate"
}

resp = requests.post(f"{BASE_URL}/auth/register/", json=register_data)
print(f"Status: {resp.status_code}")
if resp.status_code == 201:
    reg_data = resp.json()
    token = reg_data.get("token")
    refresh_token = reg_data.get("refreshToken")
    print(f"✓ Registration successful")
    print(f"  - Access Token: {token[:50]}...")
    print(f"  - Refresh Token: {refresh_token[:50]}...")
    
    # Test that we can access profile with token
    print("\n2. Testing Profile Access (Should Work)...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"✓ Profile access successful: {resp.json().get('name')}")
    
    # Test logout
    print("\n3. Testing Logout...")
    logout_data = {"refreshToken": refresh_token}
    resp = requests.post(f"{BASE_URL}/auth/logout/", json=logout_data, headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        print(f"✓ Logout successful: {resp.json().get('message')}")
    else:
        print(f"✗ Logout failed: {resp.text}")
    
    print("\n4. Testing Profile Access After Logout (Should Fail - Token Blacklisted)...")
    resp = requests.get(f"{BASE_URL}/auth/profile/", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 401:
        print(f"✓ Profile access blocked after logout")
    else:
        print(f"✗ Profile access failed: {resp.text}")
else:
    print(f"✗ Registration failed: {resp.text}")
