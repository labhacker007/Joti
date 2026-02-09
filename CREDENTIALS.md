# Default Login Credentials

## Admin User

**Username:** `admin`
**Password:** `Admin123456789!`

---

## Configuration

The admin credentials are set in the `.env` file:

```bash
ADMIN_EMAIL=admin@localhost
ADMIN_PASSWORD=Admin123456789!
```

## Important Notes

- The admin user is automatically created when the backend starts up (via `seeds.py`)
- Password must be at least 12 characters (enforced by seed script)
- To change the password, update `ADMIN_PASSWORD` in `.env` and restart the backend container:
  ```bash
  docker-compose restart backend
  ```
- For production deployments, **ALWAYS** change this password to something secure!

## Testing Login

1. Navigate to http://localhost:3000/login
2. **Username field:** Copy and paste exactly → `admin` (no quotes, all lowercase)
3. **Password field:** Copy and paste exactly → `Admin123456789!` (capital A, no spaces)
4. Click "Sign In"

### ⚠️ Important Notes:
- The password is **case-sensitive** (capital 'A' in Admin)
- Make sure there are **no extra spaces** before or after when pasting
- The username is `admin` (all lowercase, NOT "Admin" or "ADMIN")
- If copy-pasting doesn't work, type it character by character:
  - Password: `A` `d` `m` `i` `n` `1` `2` `3` `4` `5` `6` `7` `8` `9` `!`

## Troubleshooting

### If login fails with "Invalid credentials":

1. **Verify you're typing the exact credentials:**
   - Username: `admin` (all lowercase)
   - Password: `Admin123456789!` (capital A, includes the exclamation mark)

2. **Test via curl to verify backend is working:**
   ```bash
   curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d "{\"email\":\"admin\",\"password\":\"Admin123456789!\"}"
   ```
   If this returns a token, the credentials are correct and the issue is with form input.

3. **Test in browser console** (on the login page):
   ```javascript
   fetch('http://localhost:8000/auth/login', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({email: 'admin', password: 'Admin123456789!'})
   }).then(r => r.json()).then(console.log)
   ```

4. **Check backend status:**
   ```bash
   docker ps  # Ensure joti-backend-1 is running and healthy
   ```

5. **Verify admin user exists in database:**
   ```bash
   docker exec joti-backend-1 python -c "from app.core.database import SessionLocal; from app.models import User; db = SessionLocal(); user = db.query(User).filter(User.username == 'admin').first(); print(f'Admin exists: {user is not None}'); db.close()"
   ```

6. **Check backend logs for admin creation:**
   ```bash
   docker logs joti-backend-1 | grep -i "admin"
   ```

7. **If all else fails, restart backend:**
   ```bash
   docker-compose restart backend
   ```
