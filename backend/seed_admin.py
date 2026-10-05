"""Create or reset the admin login.

Usage (from the backend folder):
    python seed_admin.py                      -> admin / Visitor@123
    python seed_admin.py myuser MyPassword1   -> custom credentials

If the user already exists its password is reset, so this also fixes
"credentials not working" on any machine.
"""
import sys

from database import engine, Base, SessionLocal
import models
from security import hash_password

username = sys.argv[1] if len(sys.argv) > 1 else "admin"
password = sys.argv[2] if len(sys.argv) > 2 else "Visitor@123"

Base.metadata.create_all(bind=engine)
db = SessionLocal()
try:
    user = db.query(models.User).filter(models.User.username == username).first()
    if user:
        user.password_hash = hash_password(password)
        action = "reset"
    else:
        db.add(models.User(username=username, password_hash=hash_password(password),
                           full_name="Administrator", role="admin"))
        action = "created"
    db.commit()
    print(f"Admin '{username}' {action}. Password: {password}")
finally:
    db.close()
