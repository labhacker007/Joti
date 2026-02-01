# Security Review: `backend/app/auth/dependencies.py`

Scope: authentication, authorization enforcement helpers, and role impersonation controls.

## Findings (what to fix)

### 1) Impersonation trust model relies on token claims without independent authorization checks (High)
**What I see**
- `get_current_user()` honors token claims `is_impersonating`, `role`, `impersonator_username` and sets `_impersonation_context`.
- There is **no** independent server-side check here that the authenticated user is allowed to impersonate (e.g., admin-only or a specific permission).

**Why it matters**
- The only thing preventing “role claim escalation” is the token issuance path.
- If any token issuance bug exists (or token signing key leaks), impersonation becomes a privilege escalation amplifier.
- Defense-in-depth: authn code should not blindly trust an impersonation claim; it should verify it.

**Fix**
- Only honor impersonation claims when *both* are true:
  1) The token indicates impersonation, and
  2) The **actual user in the DB** has an explicit permission/flag (e.g., `can_impersonate_roles` or `Permission.MANAGE_RBAC`).
- Prefer encoding impersonation in a dedicated claim set, e.g.:
  - `impersonator_id`, `assumed_role`, `original_role`, `impersonation_session_id`
  - and validate these claims against DB state/audit policy.

**Acceptance criteria**
- A non-admin user cannot activate impersonation even if a token contains the impersonation fields.
- Impersonation is rejected if the DB says the user is not allowed to impersonate.

---

### 2) Inconsistent `sub` typing (string vs int) can cause subtle auth failures (Low/Medium)
**What I see**
- `get_current_user()` treats `payload["sub"]` as an `int` and passes it directly into `User.id` query.
- Other parts of the app create tokens with `"sub": str(user.id)` (string) and sometimes with `"sub": user.id` (int).

**Why it matters**
- Inconsistent typing can lead to “user not found” failures or unexpected behavior depending on DB/driver coercion.
- Auth bugs often turn into security bugs during future refactors.

**Fix**
- Standardize JWT `sub` to a string everywhere (OIDC convention), and cast to int explicitly before DB query:
  - `user_id = int(payload["sub"])` with strict error handling.

**Acceptance criteria**
- Tokens issued by all flows have consistent claim types.

---

### 3) Returning raw token decode errors in HTTP responses (Low/Medium)
**What I see**
- `decode_token()` raises `ValueError(f\"Invalid token claims: {str(e)}\")`, and `get_current_user()` returns `detail=str(e)` for `ValueError`.

**Why it matters**
- Token validation error strings can leak details useful for attackers (issuer/audience mismatch, claim values, etc.).

**Fix**
- Log detailed errors server-side.
- Return a generic `401` message (e.g., `"Invalid token"`) to clients.

**Acceptance criteria**
- Client-facing auth errors do not expose claim validation details.

