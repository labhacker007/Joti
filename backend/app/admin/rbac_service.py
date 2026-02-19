"""RBAC Service for managing role and user permissions."""
from typing import List, Dict, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import UserRole
from app.auth.rbac import Permission, get_user_permissions as get_default_user_permissions, ROLE_PERMISSIONS
import structlog

logger = structlog.get_logger()


class RBACService:
    """Service for managing role-based access control."""

    @staticmethod
    def get_all_permissions() -> List[Dict[str, str]]:
        """Get all 12 canonical permissions."""
        from app.auth.unified_permissions import get_all_permissions_list
        return get_all_permissions_list()

    @staticmethod
    def get_all_roles() -> List[Dict]:
        """Get all roles with their metadata and permissions."""
        from app.auth.unified_permissions import get_all_roles_permissions
        roles_data = get_all_roles_permissions()
        return [
            {
                "key": role_key,
                "name": role_key,
                "label": data["label"],
                "description": data["description"],
                "color": data["color"],
                "permissions": data["permissions"],
            }
            for role_key, data in roles_data.items()
        ]

    @staticmethod
    def get_role_permissions(db: Session, role: str) -> List[str]:
        """Get permissions for a specific role (DB overrides take precedence over defaults)."""
        try:
            result = db.execute(
                text("""
                    SELECT permission
                    FROM role_permissions
                    WHERE role = :role AND granted = true
                """),
                {"role": role}
            ).fetchall()

            permissions = [row[0] for row in result]

            if not permissions:
                # Fall back to code defaults
                try:
                    user_role = UserRole(role)
                    permissions = get_default_user_permissions(user_role)
                except ValueError:
                    permissions = []

            return permissions
        except Exception as e:
            logger.error("failed_to_get_role_permissions", role=role, error=str(e))
            try:
                user_role = UserRole(role)
                return get_default_user_permissions(user_role)
            except ValueError:
                return []

    @staticmethod
    def update_role_permissions(db: Session, role: str, permissions: List[str], admin_id: int) -> Dict:
        """Update permissions for a role."""
        try:
            # Validate role
            try:
                UserRole(role)
            except ValueError:
                raise ValueError(f"Invalid role: {role}")

            # Validate permissions against the 12 canonical values
            valid_permissions = {p.value for p in Permission}
            for perm in permissions:
                if perm not in valid_permissions:
                    raise ValueError(f"Invalid permission: {perm}. Must be one of: {sorted(valid_permissions)}")

            # Delete existing and insert new
            db.execute(
                text("DELETE FROM role_permissions WHERE role = :role"),
                {"role": role}
            )
            for perm in permissions:
                db.execute(
                    text("""
                        INSERT INTO role_permissions (role, permission, granted)
                        VALUES (:role, :permission, true)
                    """),
                    {"role": role, "permission": perm}
                )

            db.commit()
            logger.info("role_permissions_updated", role=role, permissions=permissions, admin_id=admin_id)

            return {
                "success": True,
                "message": f"Updated permissions for role {role}",
                "permissions": permissions
            }
        except Exception as e:
            db.rollback()
            logger.error("failed_to_update_role_permissions", role=role, error=str(e))
            raise

    @staticmethod
    def get_user_permission_overrides(db: Session, user_id: int) -> List[Dict]:
        """Get permission overrides for a specific user."""
        try:
            result = db.execute(
                text("""
                    SELECT
                        id,
                        permission,
                        granted,
                        reason,
                        created_by_id,
                        created_at
                    FROM user_permission_overrides
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id}
            ).fetchall()

            return [
                {
                    "id": row[0],
                    "permission": row[1],
                    "granted": row[2],
                    "reason": row[3],
                    "created_by_id": row[4],
                    "created_at": row[5].isoformat() if row[5] else None
                }
                for row in result
            ]
        except Exception as e:
            logger.error("failed_to_get_user_overrides", user_id=user_id, error=str(e))
            return []

    @staticmethod
    def set_user_permission_override(
        db: Session,
        user_id: int,
        permission: str,
        granted: bool,
        reason: Optional[str],
        admin_id: int
    ) -> Dict:
        """Set a permission override for a specific user."""
        try:
            # Validate permission
            valid_permissions = {p.value for p in Permission}
            if permission not in valid_permissions:
                raise ValueError(f"Invalid permission: {permission}")

            existing = db.execute(
                text("""
                    SELECT id FROM user_permission_overrides
                    WHERE user_id = :user_id AND permission = :permission
                """),
                {"user_id": user_id, "permission": permission}
            ).fetchone()

            if existing:
                db.execute(
                    text("""
                        UPDATE user_permission_overrides
                        SET granted = :granted,
                            reason = :reason,
                            created_by_id = :admin_id,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = :user_id AND permission = :permission
                    """),
                    {"user_id": user_id, "permission": permission, "granted": granted,
                     "reason": reason, "admin_id": admin_id}
                )
            else:
                db.execute(
                    text("""
                        INSERT INTO user_permission_overrides
                        (user_id, permission, granted, reason, created_by_id)
                        VALUES (:user_id, :permission, :granted, :reason, :admin_id)
                    """),
                    {"user_id": user_id, "permission": permission, "granted": granted,
                     "reason": reason, "admin_id": admin_id}
                )

            db.commit()
            logger.info("user_permission_override_set", user_id=user_id, permission=permission,
                        granted=granted, admin_id=admin_id)

            return {
                "success": True,
                "message": f"Permission override set for user {user_id}",
                "permission": permission,
                "granted": granted
            }
        except Exception as e:
            db.rollback()
            logger.error("failed_to_set_user_override", user_id=user_id, error=str(e))
            raise

    @staticmethod
    def remove_user_permission_override(db: Session, user_id: int, permission: str, admin_id: int) -> Dict:
        """Remove a permission override for a specific user."""
        try:
            db.execute(
                text("""
                    DELETE FROM user_permission_overrides
                    WHERE user_id = :user_id AND permission = :permission
                """),
                {"user_id": user_id, "permission": permission}
            )
            db.commit()
            logger.info("user_permission_override_removed", user_id=user_id, permission=permission,
                        admin_id=admin_id)
            return {"success": True, "message": f"Permission override removed for user {user_id}"}
        except Exception as e:
            db.rollback()
            logger.error("failed_to_remove_user_override", user_id=user_id, error=str(e))
            raise

    @staticmethod
    def get_effective_user_permissions(db: Session, user_id: int, user_role: str) -> List[str]:
        """Get effective permissions for a user (role permissions + overrides)."""
        try:
            role_permissions = set(RBACService.get_role_permissions(db, user_role))

            overrides = db.execute(
                text("""
                    SELECT permission, granted
                    FROM user_permission_overrides
                    WHERE user_id = :user_id
                """),
                {"user_id": user_id}
            ).fetchall()

            for permission, granted in overrides:
                if granted:
                    role_permissions.add(permission)
                else:
                    role_permissions.discard(permission)

            return list(role_permissions)
        except Exception as e:
            logger.error("failed_to_get_effective_permissions", user_id=user_id, error=str(e))
            return RBACService.get_role_permissions(db, user_role)

    @staticmethod
    def get_permission_matrix(db: Session) -> Dict:
        """Get the full permission matrix (all roles x all permissions)."""
        roles = RBACService.get_all_roles()
        permissions = RBACService.get_all_permissions()

        matrix = {}
        for role in roles:
            role_key = role["key"]
            role_perms = set(RBACService.get_role_permissions(db, role_key))
            matrix[role_key] = {
                "role": role,
                "permissions": {
                    perm["key"]: (perm["key"] in role_perms)
                    for perm in permissions
                }
            }

        return {
            "roles": roles,
            "permissions": permissions,
            "matrix": matrix
        }
