"""
FluxShield Authentication Module
SQLite-backed user registration and login with bcrypt password hashing.
"""

import sqlite3
import bcrypt
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fluxshield_users.db")


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the users table if it doesn't exist."""
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer',
            institution TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def signup_user(username: str, email: str, password: str, role: str = "viewer",
                institution: str = ""):
    """
    Register a new user. Returns (success: bool, message: str, user_data: dict|None).
    Password is hashed with bcrypt before storage.
    """
    if not username or not email or not password:
        return False, "All fields are required.", None

    if len(password) < 6:
        return False, "Password must be at least 6 characters.", None

    # Hash the password
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO users (username, email, password_hash, role, institution) VALUES (?, ?, ?, ?, ?)",
            (username.strip(), email.strip().lower(), password_hash, role.lower(), institution.strip()),
        )
        conn.commit()

        # Fetch the created user
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
        user_data = {
            "id": row["id"],
            "username": row["username"],
            "email": row["email"],
            "role": row["role"],
            "institution": row["institution"],
        }
        return True, "Account created successfully.", user_data

    except sqlite3.IntegrityError as e:
        err = str(e).lower()
        if "email" in err:
            return False, "An account with this email already exists.", None
        if "username" in err:
            return False, "This username is already taken.", None
        return False, "Registration failed. Please try again.", None
    finally:
        conn.close()


def login_user(email: str, password: str):
    """
    Authenticate a user by email + password.
    Returns (success: bool, message: str, user_data: dict|None).
    """
    if not email or not password:
        return False, "Email and password are required.", None

    conn = _get_conn()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),)).fetchone()
    conn.close()

    if not row:
        return False, "No account found with this email.", None

    # Verify password
    if not bcrypt.checkpw(password.encode("utf-8"), row["password_hash"].encode("utf-8")):
        return False, "Invalid password. Access denied.", None

    user_data = {
        "id": row["id"],
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
        "institution": row["institution"],
    }
    return True, "Authentication successful.", user_data


# Initialize the database on module import
init_db()
