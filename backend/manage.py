#!/usr/bin/env python
"""
Joti management CLI — similar to Django's manage.py.

Usage:
    python manage.py createsuperuser
    python manage.py createsuperuser --email admin@example.com --password secret
    python manage.py createuser
    python manage.py createuser --email analyst@example.com --password secret --role ANALYST
    python manage.py listusers
    python manage.py changepassword --email user@example.com --password newpassword
    python manage.py deactivateuser --email user@example.com
    python manage.py activateuser --email user@example.com
"""
import sys
import os
import argparse
import getpass

# Ensure project root is on path so `app` package is importable
sys.path.insert(0, os.path.dirname(__file__))


def _get_db():
    from app.core.database import SessionLocal
    return SessionLocal()


def _prompt(label: str, secret: bool = False, default: str = None) -> str:
    prompt_text = f"{label}"
    if default:
        prompt_text += f" [{default}]"
    prompt_text += ": "
    if secret:
        value = getpass.getpass(prompt_text)
        if not value and default:
            return default
        return value
    value = input(prompt_text).strip()
    if not value and default:
        return default
    return value


def cmd_createsuperuser(args):
    """Create an admin superuser interactively or from flags."""
    from app.models import User, UserRole
    from app.auth.security import hash_password

    email = args.email or _prompt("Email")
    if not email:
        print("Error: email is required.")
        sys.exit(1)

    username = args.username or _prompt("Username", default=email.split("@")[0])
    full_name = args.full_name or _prompt("Full name (optional)", default="")
    password = args.password or _prompt("Password", secret=True)
    if not password:
        print("Error: password is required.")
        sys.exit(1)

    db = _get_db()
    try:
        existing = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        if existing:
            print(f"Error: a user with email '{email}' or username '{username}' already exists.")
            sys.exit(1)

        user = User(
            email=email,
            username=username,
            full_name=full_name or None,
            hashed_password=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Superuser created successfully.")
        print(f"  Email:    {email}")
        print(f"  Username: {username}")
        print(f"  Role:     ADMIN")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


def cmd_createuser(args):
    """Create a regular user interactively or from flags."""
    from app.models import User, UserRole
    from app.auth.security import hash_password

    valid_roles = [r.value for r in UserRole]

    email = args.email or _prompt("Email")
    if not email:
        print("Error: email is required.")
        sys.exit(1)

    username = args.username or _prompt("Username", default=email.split("@")[0])
    full_name = args.full_name or _prompt("Full name (optional)", default="")

    if args.role:
        role_str = args.role.upper()
    else:
        print(f"Available roles: {', '.join(valid_roles)}")
        role_str = _prompt("Role", default="VIEWER").upper()

    if role_str not in valid_roles:
        print(f"Error: invalid role '{role_str}'. Choose from: {', '.join(valid_roles)}")
        sys.exit(1)

    password = args.password or _prompt("Password", secret=True)
    if not password:
        print("Error: password is required.")
        sys.exit(1)

    db = _get_db()
    try:
        existing = db.query(User).filter(
            (User.email == email) | (User.username == username)
        ).first()
        if existing:
            print(f"Error: a user with email '{email}' or username '{username}' already exists.")
            sys.exit(1)

        user = User(
            email=email,
            username=username,
            full_name=full_name or None,
            hashed_password=hash_password(password),
            role=UserRole(role_str),
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"User created successfully.")
        print(f"  Email:    {email}")
        print(f"  Username: {username}")
        print(f"  Role:     {role_str}")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


def cmd_listusers(args):
    """List all users."""
    from app.models import User

    db = _get_db()
    try:
        users = db.query(User).order_by(User.id).all()
        if not users:
            print("No users found.")
            return

        print(f"{'ID':<5} {'Email':<35} {'Username':<20} {'Role':<12} {'Active'}")
        print("-" * 80)
        for u in users:
            active = "Yes" if u.is_active else "No"
            print(f"{u.id:<5} {u.email:<35} {u.username:<20} {u.role.value:<12} {active}")
    finally:
        db.close()


def cmd_changepassword(args):
    """Change a user's password."""
    from app.models import User
    from app.auth.security import hash_password

    email = args.email or _prompt("Email of user to update")
    if not email:
        print("Error: email is required.")
        sys.exit(1)

    password = args.password or _prompt("New password", secret=True)
    if not password:
        print("Error: password is required.")
        sys.exit(1)

    db = _get_db()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: no user found with email '{email}'.")
            sys.exit(1)
        user.hashed_password = hash_password(password)
        db.commit()
        print(f"Password updated for {email}.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


def cmd_deactivateuser(args):
    """Deactivate a user account."""
    from app.models import User

    email = args.email or _prompt("Email of user to deactivate")
    db = _get_db()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: no user found with email '{email}'.")
            sys.exit(1)
        user.is_active = False
        db.commit()
        print(f"User '{email}' deactivated.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


def cmd_activateuser(args):
    """Activate a user account."""
    from app.models import User

    email = args.email or _prompt("Email of user to activate")
    db = _get_db()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: no user found with email '{email}'.")
            sys.exit(1)
        user.is_active = True
        db.commit()
        print(f"User '{email}' activated.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(
        description="Joti management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    subparsers = parser.add_subparsers(dest="command", metavar="command")

    # createsuperuser
    p = subparsers.add_parser("createsuperuser", help="Create an admin superuser")
    p.add_argument("--email", help="User email address")
    p.add_argument("--username", help="Username (defaults to email prefix)")
    p.add_argument("--full-name", dest="full_name", help="Full name")
    p.add_argument("--password", help="Password (prompted if omitted)")

    # createuser
    p = subparsers.add_parser("createuser", help="Create a regular user")
    p.add_argument("--email", help="User email address")
    p.add_argument("--username", help="Username (defaults to email prefix)")
    p.add_argument("--full-name", dest="full_name", help="Full name")
    p.add_argument("--password", help="Password (prompted if omitted)")
    p.add_argument(
        "--role",
        help="Role: ADMIN, ANALYST, ENGINEER, MANAGER, EXECUTIVE, VIEWER (default: VIEWER)",
        default="VIEWER",
    )

    # listusers
    subparsers.add_parser("listusers", help="List all users")

    # changepassword
    p = subparsers.add_parser("changepassword", help="Change a user's password")
    p.add_argument("--email", help="Email of the user")
    p.add_argument("--password", help="New password (prompted if omitted)")

    # deactivateuser
    p = subparsers.add_parser("deactivateuser", help="Deactivate a user account")
    p.add_argument("--email", help="Email of the user")

    # activateuser
    p = subparsers.add_parser("activateuser", help="Activate a user account")
    p.add_argument("--email", help="Email of the user")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "createsuperuser": cmd_createsuperuser,
        "createuser": cmd_createuser,
        "listusers": cmd_listusers,
        "changepassword": cmd_changepassword,
        "deactivateuser": cmd_deactivateuser,
        "activateuser": cmd_activateuser,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
