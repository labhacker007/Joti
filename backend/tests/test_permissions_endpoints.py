import os


def login_admin(client):
    r = client.post("/auth/login", json={"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_users_my_permissions_returns_expected_shape(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/users/my-permissions", headers=headers)
    assert r.status_code == 200
    data = r.json()

    assert isinstance(data.get("api_permissions"), list)
    assert isinstance(data.get("all_permissions"), list)
    assert data["api_permissions"] == data["all_permissions"]
    assert data.get("effective_role") == "ADMIN"


def test_rbac_permissions_endpoint_returns_12_permissions(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/admin/rbac/permissions", headers=headers)
    assert r.status_code == 200
    data = r.json()

    perms = data.get("permissions", [])
    assert len(perms) == 12, f"Expected 12 permissions, got {len(perms)}"

    keys = {p["key"] for p in perms}
    assert "articles:read" in keys
    assert "admin:rbac" in keys
    assert "admin:system" in keys


def test_rbac_roles_endpoint_returns_all_roles(client):
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    r = client.get("/admin/rbac/roles", headers=headers)
    assert r.status_code == 200
    data = r.json()

    roles = data.get("roles", [])
    role_keys = {r["key"] for r in roles}

    assert "ADMIN" in role_keys
    assert "ANALYST" in role_keys
    assert "ENGINEER" in role_keys
    assert "MANAGER" in role_keys
    assert "EXECUTIVE" in role_keys
    assert "VIEWER" in role_keys

    # ADMIN should have all 12 permissions
    admin_role = next(r for r in roles if r["key"] == "ADMIN")
    assert len(admin_role["permissions"]) == 12
