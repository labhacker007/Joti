"""Database seed script for initial data."""
import json
import os
from app.core.database import SessionLocal
from app.models import FeedSource, WatchListKeyword, ConnectorConfig, User, UserRole
from app.auth.security import hash_password
from datetime import datetime

# Get the project root directory (parent of backend/)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_SCRIPT_DIR)
_PROJECT_ROOT = os.path.dirname(_BACKEND_DIR)
_CONFIG_FILE = os.path.join(_PROJECT_ROOT, "config", "seed-sources.json")


def run_migrations(db):
    """Run any pending schema migrations."""
    from sqlalchemy import text
    from app.core.config import settings
    
    # Only run PostgreSQL-specific migrations if using PostgreSQL
    if settings.DATABASE_URL.startswith("postgresql"):
        try:
            db.execute(text("ALTER TYPE articlestatus ADD VALUE IF NOT EXISTS 'HUNT_GENERATED' AFTER 'NEED_TO_HUNT'"))
            db.commit()
            print("✓ Added HUNT_GENERATED to articlestatus enum")
        except Exception:
            # Already exists or error - ignore
            db.rollback()
    else:
        # SQLite doesn't need enum migrations
        print("✓ Using SQLite - no enum migrations needed")


def seed_database():
    """Initialize database with seed data."""
    db = SessionLocal()
    
    # Run migrations first
    run_migrations(db)
    
    try:
        # Create default admin user with password from environment variable
        # SECURITY: Admin password MUST be set via ADMIN_PASSWORD environment variable
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin_password = os.environ.get("ADMIN_PASSWORD")
            if not admin_password:
                print("⚠ ADMIN_PASSWORD not set - skipping admin user creation")
                print("  Set ADMIN_PASSWORD environment variable to create admin user")
            else:
                # Validate password strength
                if len(admin_password) < 12:
                    print("⚠ ADMIN_PASSWORD must be at least 12 characters - skipping admin user creation")
                else:
                    admin = User(
                        email=os.environ.get("ADMIN_EMAIL", "admin@localhost"),
                        username="admin",
                        hashed_password=hash_password(admin_password),
                        role=UserRole.ADMIN,
                        is_active=True,
                        full_name="Administrator"
                    )
                    db.add(admin)
                    print("✓ Created admin user (password from ADMIN_PASSWORD env var)")
        
        # Load feed sources - try multiple paths
        sources_data = []
        config_paths = [
            _CONFIG_FILE,
            "config/seed-sources.json",
            "../config/seed-sources.json",
            os.path.join(os.getcwd(), "config", "seed-sources.json")
        ]
        for config_path in config_paths:
            if os.path.exists(config_path):
                with open(config_path, "r") as f:
                    sources_data = json.load(f)
                print(f"✓ Loaded sources from {config_path}")
                break
        else:
            print("⚠ No seed-sources.json found, skipping feed sources")
        
        for source_data in sources_data:
            existing = db.query(FeedSource).filter(FeedSource.url == source_data["url"]).first()
            if not existing:
                source = FeedSource(
                    name=source_data["name"],
                    description=source_data.get("description"),
                    url=source_data["url"],
                    feed_type=source_data.get("feed_type", "rss"),
                    is_active=True,
                    next_fetch=datetime.utcnow()
                )
                db.add(source)
                print(f"✓ Added feed source: {source_data['name']}")
        
        # Add default watchlist keywords
        default_keywords = [
            "ransomware",
            "malware",
            "zero-day",
            "critical vulnerability",
            "data breach",
            "APT",
            "supply chain attack",
            "phishing"
        ]
        
        for keyword in default_keywords:
            existing = db.query(WatchListKeyword).filter(
                WatchListKeyword.keyword == keyword
            ).first()
            if not existing:
                wl = WatchListKeyword(keyword=keyword, is_active=True)
                db.add(wl)
                print(f"✓ Added watchlist keyword: {keyword}")
        
        # Add default connectors (stubs)
        connectors = [
            {"name": "xsiam", "type": "xsiam", "config": {}},
            {"name": "defender", "type": "defender", "config": {}},
            {"name": "wiz", "type": "wiz", "config": {}},
            {"name": "splunk", "type": "splunk", "config": {}},
            {"name": "slack", "type": "slack", "config": {}},
            {"name": "email", "type": "email", "config": {}},
        ]
        
        for connector_data in connectors:
            existing = db.query(ConnectorConfig).filter(
                ConnectorConfig.name == connector_data["name"]
            ).first()
            if not existing:
                connector = ConnectorConfig(
                    name=connector_data["name"],
                    connector_type=connector_data["type"],
                    config=connector_data["config"],
                    is_active=False  # Require manual configuration
                )
                db.add(connector)
                print(f"✓ Added connector config: {connector_data['name']}")
        
        db.commit()
        print("\n✅ Database seeding complete!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
