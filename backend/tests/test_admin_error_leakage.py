import os


def login_admin(client):
    r = client.post("/auth/login", json={"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]})
    assert r.status_code == 200
    return r.json()["access_token"]


def test_admin_errors_do_not_leak_exception_details(client, monkeypatch):
    """Verify that backend errors don't expose internal exception details."""
    token = login_admin(client)
    headers = {"Authorization": f"Bearer {token}"}

    import app.auth.unified_permissions as unified_permissions

    def _boom():
        raise Exception("TOP_SECRET_EXCEPTION_DETAIL")

    monkeypatch.setattr(unified_permissions, "get_all_roles_permissions", _boom)

    r = client.get("/admin/rbac/roles", headers=headers)
    assert r.status_code == 500
    assert "TOP_SECRET_EXCEPTION_DETAIL" not in r.text
    assert r.json()["detail"] == "Failed to get roles"
