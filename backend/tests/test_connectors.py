from app.core.database import SessionLocal
from app.models import ConnectorConfig


def test_seeded_connectors_exist():
    db = SessionLocal()
    try:
        connectors = db.query(ConnectorConfig).all()
        names = {c.name for c in connectors}
        expected = {"xsiam", "defender", "wiz", "slack", "email"}
        assert expected.issubset(names)
        # Seeded connectors should be inactive by default
        for c in connectors:
            if c.name in expected:
                assert c.is_active is False
    finally:
        db.close()
