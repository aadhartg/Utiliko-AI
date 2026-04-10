import requests

login_res = requests.post("http://localhost:8000/api/auth/login", json={"email": "superadmin@utiliko.com", "password": "Test@123"})
print("Login:", login_res.status_code, login_res.text)

if login_res.status_code == 200:
    token = login_res.json()["access_token"]
    res = requests.post("http://localhost:8000/api/lms/departments", 
                        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                        json={"name": "Sales", "description": "test desc"})
    print("POST Department:", res.status_code, res.text)
