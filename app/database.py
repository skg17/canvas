"""Database setup and session management."""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from app.config import settings

# Handle SQLite database path
database_url = settings.database_url
if database_url.startswith("sqlite:///"):
    # Extract path and ensure directory exists
    db_path = database_url.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
        print(f"Created database directory: {db_dir}")
    
    # Log database location for debugging
    if os.path.exists(db_path):
        file_size = os.path.getsize(db_path)
        print(f"Using existing database at: {db_path} (size: {file_size} bytes)")
    else:
        print(f"Creating new database at: {db_path}")
        print(f"Database directory: {db_dir} (exists: {os.path.exists(db_dir)})")

engine = create_engine(
    database_url,
    connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for getting database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables (only creates if they don't exist)."""
    # Check if database file exists and has data
    if database_url.startswith("sqlite:///"):
        db_path = database_url.replace("sqlite:///", "")
        if os.path.exists(db_path):
            import sqlite3
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='watchlist_items'")
                table_exists = cursor.fetchone() is not None
                if table_exists:
                    cursor.execute("SELECT COUNT(*) FROM watchlist_items")
                    count = cursor.fetchone()[0]
                    print(f"Database exists with {count} items. Preserving existing data.")
                conn.close()
            except Exception as e:
                print(f"Warning: Could not check existing database: {e}")
    
    # Use create_all with checkfirst=True to avoid recreating existing tables
    # This ensures we never drop existing data
    Base.metadata.create_all(bind=engine, checkfirst=True)
    
    # Add new column if it doesn't exist (for existing databases)
    if database_url.startswith("sqlite:///"):
        try:
            import sqlite3
            db_path = database_url.replace("sqlite:///", "")
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                # Check if column exists
                cursor.execute("PRAGMA table_info(watchlist_items)")
                columns = [column[1] for column in cursor.fetchall()]
                if 'watched_manually_set' not in columns:
                    cursor.execute("ALTER TABLE watchlist_items ADD COLUMN watched_manually_set BOOLEAN DEFAULT 0")
                    conn.commit()
                    print("Added 'watched_manually_set' column to existing database")
                if 'queue_order' not in columns:
                    cursor.execute("ALTER TABLE watchlist_items ADD COLUMN queue_order INTEGER")
                    conn.commit()
                    print("Added 'queue_order' column to existing database")
                if 'genres' not in columns:
                    cursor.execute("ALTER TABLE watchlist_items ADD COLUMN genres TEXT")
                    conn.commit()
                    print("Added 'genres' column to existing database")
                conn.close()
        except Exception as e:
            print(f"Warning: Could not add new column to database: {e}")
    
    print("Database tables initialized (existing tables preserved)")

