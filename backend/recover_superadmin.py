import requests
import getpass
import os
from urllib.parse import urljoin

# --- Configuration ---
BASE_URL = "http://127.0.0.1:8000"  # Your local FastAPI server URL
SUPERADMIN_EMAIL = os.environ.get("SUPERADMIN_EMAIL", "superadmin@example.com")

def get_api_error_message(response: requests.Response):
    """Extracts a readable error message from an API response."""
    try:
        detail = response.json().get("detail")
        if isinstance(detail, list):
            return "; ".join(
                [
                    f"{err.get('loc', ['unknown_field'])[-1]}: {err.get('msg', 'unknown error')}"
                    for err in detail
                ]
            )
        return detail or f"HTTP {response.status_code}"
    except (ValueError, AttributeError):
        return f"HTTP {response.status_code}: {response.text}"

def request_password_reset():
    """Calls the API to request a password reset code for the superadmin."""
    url = urljoin(BASE_URL, "/api/v1/auth/request-password-reset")
    print(f"[*] Requesting password reset for: {SUPERADMIN_EMAIL}")
    try:
        response = requests.post(url, json={"email": SUPERADMIN_EMAIL})
        if response.status_code == 200:
            print("[+] Successfully requested password reset.")
            print("[!] In a real environment, an email would be sent.")
            print("[!] For local dev, you must now retrieve the code from the 'password_reset_codes' table in your database.")
            return True
        else:
            print(f"[!] Error requesting reset: {get_api_error_message(response)}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"[!] Connection Error: Is the backend server running at {BASE_URL}?")
        return False

def perform_password_reset():
    """Guides the user to input the reset code and new password to finalize the reset."""
    reset_code = input("[?] Enter the reset code from the database: ").strip()
    if not reset_code:
        print("[!] Reset code cannot be empty.")
        return

    new_password = getpass.getpass("[?] Enter your new password: ")
    if not new_password:
        print("[!] Password cannot be empty.")
        return

    confirm_password = getpass.getpass("[?] Confirm your new password: ")
    if new_password != confirm_password:
        print("[!] Passwords do not match.")
        return

    url = urljoin(BASE_URL, "/api/v1/auth/reset-password")
    payload = {
        "token": reset_code,
        "new_password": new_password,
    }

    print("[*] Attempting to reset password...")
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("\n[+] Success! Your superadmin password has been reset.")
            print("[*] You can now log in with your new password.")
        else:
            print(f"[!] Error resetting password: {get_api_error_message(response)}")
    except requests.exceptions.ConnectionError:
        print(f"[!] Connection Error: Is the backend server running at {BASE_URL}?")

def clear_totp_fields():
    """
    Connects to the database to clear TOTP fields for the superadmin.
    This is a sensitive operation and should only be used for local recovery.
    """
    from sqlalchemy import create_engine, update
    from sqlalchemy.orm import sessionmaker
    import sys

    # Add app path to allow model imports
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
    from models.user import User
    from core.config import get_settings

    print("\n[*] Connecting to the database to clear TOTP fields...")
    
    try:
        settings = get_settings()
        engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        # Find the superadmin user
        superadmin_user = db.query(User).filter(User.email == SUPERADMIN_EMAIL).first()

        if not superadmin_user:
            print(f"[!] Could not find superadmin with email: {SUPERADMIN_EMAIL}")
            db.close()
            return

        # Update the user object
        superadmin_user.is_totp_enabled = False
        superadmin_user.totp_secret = None
        # Increment token_version to invalidate any existing sessions
        superadmin_user.token_version += 1

        db.commit()
        
        print(f"[+] Successfully disabled TOTP for {SUPERADMIN_EMAIL}.")
        print(f"[+] Incremented token_version to {superadmin_user.token_version} to invalidate old sessions.")

    except Exception as e:
        print(f"[!] An error occurred during database operation: {e}")
        if 'db' in locals() and db.is_active:
            db.rollback()
    finally:
        if 'db' in locals() and db.is_active:
            db.close()


def main():
    """Main function to drive the recovery process."""
    print("--- Superadmin Recovery for Local Development ---")
    print("Choose your recovery scenario:")
    print("1. I forgot my password ONLY.")
    print("2. I forgot my password AND lost my TOTP device.")
    
    choice = input("Enter your choice (1 or 2): ").strip()

    if choice not in ["1", "2"]:
        print("Invalid choice. Please run the script again.")
        return

    # Step 1: Request the password reset. This is common for both scenarios.
    if not request_password_reset():
        return

    # Step 2: Guide user to get the code and reset the password.
    perform_password_reset()

    # Step 3 (Optional): Clear TOTP fields if requested.
    if choice == "2":
        print("\n-------------------------------------------------")
        print("Proceeding to clear TOTP (MFA) fields from your account.")
        confirm_totp_clear = input("Are you sure you want to do this? (yes/no): ").strip().lower()
        if confirm_totp_clear == 'yes':
            clear_totp_fields()
        else:
            print("[*] TOTP clearing skipped.")

if __name__ == "__main__":
    main()
