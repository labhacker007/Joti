#!/usr/bin/env python
"""Quick script to create admin user."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models import User, UserRole
from app.auth.security import hash_password

db = SessionLocal()

try:
    # Check if admin exists
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print("✓ Admin user already exists")
    else:
        # Create admin user
        admin = User(
            email="admin@example.com",
            username="admin",
            hashed_password=hash_password("admin1234567"),
            role=UserRole.ADMIN,
            is_active=True,
            full_name="Administrator"
        )
        db.add(admin)
        db.commit()
        print("✓ Admin user created successfully")
        print(f"  Email: admin@example.com")
        print(f"  Password: admin1234567")
except Exception as e:
    print(f"✗ Error: {e}")
    db.rollback()
finally:
    db.close()
