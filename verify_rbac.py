import requests
import json

BASE_URL = "http://localhost:8001/api"

def test_rbac():
    print("--- Starting RBAC Verification ---")
    
    # 1. Login as Admin
    print("\n[1] Logging in as Admin...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@utiliko.io",
        "password": "admin123"
    })
    if login_res.status_code != 200:
        print(f"FAILED: Admin login failed with {login_res.status_code}")
        return
    
    admin_data = login_res.json()
    admin_token = admin_data["access_token"]
    print("SUCCESS: Admin logged in.")

    # 2. Register a Test Employee (as Admin)
    print("\n[2] Registering a Test Employee...")
    reg_res = requests.post(
        f"{BASE_URL}/auth/register/employee",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "email": "test_emp@utiliko.io",
            "password": "password123",
            "full_name": "Test Employee"
        }
    )
    if reg_res.status_code not in [200, 400]: # 400 if already exists
        print(f"FAILED: Employee registration failed with {reg_res.status_code}")
        return
    print("SUCCESS: Employee registered (or already exists).")

    # 3. Login as Employee
    print("\n[3] Logging in as Employee...")
    emp_login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "test_emp@utiliko.io",
        "password": "password123"
    })
    emp_data = emp_login_res.json()
    emp_token = emp_data["access_token"]
    print("SUCCESS: Employee logged in.")

    # 4. Attempt unauthorized access to Audit Log
    print("\n[4] Attempting unauthorized access to /audit-log/ (Employee role)...")
    audit_res = requests.get(
        f"{BASE_URL}/audit-log/",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    if audit_res.status_code == 403:
        print("PASS: Access denied (403 Forbidden) as expected.")
    else:
        print(f"FAIL: Unexpected status code {audit_res.status_code}")

    # 5. Attempt unauthorized access to Monitor
    print("\n[5] Attempting unauthorized access to /monitor/ (Employee role)...")
    monitor_res = requests.get(
        f"{BASE_URL}/monitor/",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    if monitor_res.status_code == 403:
        print("PASS: Access denied (403 Forbidden) as expected.")
    else:
        print(f"FAIL: Unexpected status code {monitor_res.status_code}")

    # 6. Attempt unauthorized access to Workflow Uploads
    print("\n[6] Attempting unauthorized access to /workflow/uploads (Employee role)...")
    upload_res = requests.get(
        f"{BASE_URL}/workflow/uploads",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    if upload_res.status_code == 403:
        print("PASS: Access denied (403 Forbidden) as expected.")
    else:
        print(f"FAIL: Unexpected status code {upload_res.status_code}")

    # 7. Attempt unauthenticated access to Departments
    print("\n[7] Attempting unauthenticated access to /lms/departments...")
    dep_res = requests.get(f"{BASE_URL}/lms/departments")
    if dep_res.status_code in [401, 403, 422]:
        print(f"PASS: Access denied ({dep_res.status_code}) as expected.")
    else:
        print(f"FAIL: Unexpected status code {dep_res.status_code}")

    # 8. Attempt authenticated access to Departments (Employee role)
    print("\n[8] Attempting authenticated access to /lms/departments (Employee role)...")
    dep_res_auth = requests.get(
        f"{BASE_URL}/lms/departments",
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    if dep_res_auth.status_code == 200:
        print("PASS: Access granted (200 OK) as expected.")
    else:
        print(f"FAIL: Unexpected status code {dep_res_auth.status_code}")

    print("\n--- RBAC Verification Complete ---")

if __name__ == "__main__":
    test_rbac()
