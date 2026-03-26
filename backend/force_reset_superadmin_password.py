import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# --- Add project root to path to allow model and config imports ---
# This ensures that the script can find the 'app' directory and its modules
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(script_dir, 'app')))

# This is crucial: Change the working directory to the script's location
# so that pydantic can find the `.env` file.
os.chdir(script_dir)

from core.config import settings
from core.security import hash_password
from app.db.base import Base
from app.models.user import User

# --- Configuration ---
# It's recommended to use environment variables, but for a one-off script, this is clear.
SUPERADMIN_EMAIL = os.environ.get("SUPERADMIN_EMAIL", "superadmin@example.com")
NEW_PASSWORD = "SuperAdmin123"

def force_password_reset():
    """
    Connects directly to the database to reset the superadmin password.
    This is a powerful, direct-access script for local development recovery only.
    """
    print("[*] Initializing database connection...")
    
    try:
        engine = create_engine(str(settings.DATABASE_URL))
        
        # Reflect the existing 'users' table from the database
        Base.metadata.reflect(bind=engine, only=['users'])

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        print(f"[*] Searching for superadmin user: {SUPERADMIN_EMAIL}")
        superadmin_user = db.query(User).filter(User.email == SUPERADMIN_EMAIL).first()

        if not superadmin_user:
            print(f"[!] ERROR: Could not find superadmin user with email '{SUPERADMIN_EMAIL}'.")
            db.close()
            return

        print(f"[+] Found user: {superadmin_user.full_name} (ID: {superadmin_user.id})")

        # Generate the hash for the new password
        new_hashed_password = hash_password(NEW_PASSWORD)
        print("[*] Generated new password hash.")

        # Update the user object
        superadmin_user.hashed_password = new_hashed_password
        superadmin_user.token_version += 1
        
        db.commit()

        print("\n--- SUCCESS ---")
        print(f"[+] Password for '{SUPERADMIN_EMAIL}' has been reset.")
        print(f"[+] token_version has been incremented to {superadmin_user.token_version} to invalidate old sessions.")
        print("-----------------")

    except Exception as e:
        print(f"[!] An error occurred during the database operation: {e}")
        if 'db' in locals() and db.is_active:
            db.rollback()
            print("[!] Database transaction was rolled back.")
    finally:
        if 'db' in locals() and db.is_active:
            db.close()
            print("[*] Database connection closed.")

if __name__ == "__main__":
    print("--- Superadmin Force Password Reset Script ---")
    print("WARNING: This script will directly modify the database.")
    print(f"It will reset the password for '{SUPERADMIN_EMAIL}' to '{NEW_PASSWORD}'.")
    
    confirm = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
    
    if confirm == 'yes':
        force_password_reset()
    else:
        print("[*] Operation cancelled.")
