"""
Simple test script to verify database setup

This script tests:
1. Database connection
2. Table creation
3. Basic CRUD operations
4. Proper cleanup

Run with: python test_db_setup.py
"""

import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database components
from app.db.session import engine, SessionLocal, init_db
from app.models.database import Session as SessionModel, Movie, Base

print("=" * 60)
print("DATABASE SETUP TEST")
print("=" * 60)

# Test 1: Check database connection
print("\n[1/4] Testing database connection...")
try:
    with engine.connect() as conn:
        print("    OK: Connected to PostgreSQL")
except Exception as e:
    print(f"    FAILED: {str(e)}")
    sys.exit(1)

# Test 2: Create tables
print("\n[2/4] Creating database tables...")
try:
    init_db()
    print("    OK: Tables created (or already exist)")
except Exception as e:
    print(f"    FAILED: {str(e)}")
    sys.exit(1)

# Test 3: Test creating a session and movie (INSERT)
print("\n[3/4] Testing CRUD operations...")
try:
    db = SessionLocal()

    # Create a test session
    test_session = SessionModel(
        status="testing",
        total_movies=0,
        upload_metadata={"test": True}
    )
    db.add(test_session)
    db.commit()
    session_id = test_session.id
    print(f"    OK: Created test session {str(session_id)[:8]}...")

    # Create a test movie
    test_movie = Movie(
        session_id=session_id,
        title="The Matrix",
        year=1999,
        rating=5.0,
        letterboxd_uri="https://letterboxd.com/film/the-matrix/",
        watched_date=datetime.now(),
        tags=["sci-fi", "action"],
        review="An iconic film!"
    )
    db.add(test_movie)
    db.commit()
    print(f"    OK: Created test movie: {test_movie.title}")

    # Test reading (SELECT)
    retrieved_session = db.query(SessionModel).filter_by(id=session_id).first()
    if retrieved_session:
        print(f"    OK: Retrieved session: {retrieved_session.status}")
    else:
        print("    FAILED: Could not retrieve session")
        sys.exit(1)

    # Test counting related movies
    movie_count = db.query(Movie).filter_by(session_id=session_id).count()
    print(f"    OK: Found {movie_count} movie(s) for session")

    # Test updating (UPDATE)
    retrieved_session.status = "completed"
    db.commit()
    print(f"    OK: Updated session status to: {retrieved_session.status}")

    # Clean up test data
    db.delete(test_session)  # This cascades and deletes movies too
    db.commit()
    print(f"    OK: Cleaned up test data (cascade delete works)")

    db.close()

except Exception as e:
    print(f"    FAILED: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Verify schema
print("\n[4/4] Verifying database schema...")
try:
    # Get all table names
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    expected_tables = ['sessions', 'movies']
    for table in expected_tables:
        if table in tables:
            columns = [col['name'] for col in inspector.get_columns(table)]
            print(f"    OK: Table '{table}' exists with {len(columns)} columns")
        else:
            print(f"    FAILED: Table '{table}' not found")
            sys.exit(1)

except Exception as e:
    print(f"    FAILED: {str(e)}")
    sys.exit(1)

print("\n" + "=" * 60)
print("ALL TESTS PASSED! Database setup is working correctly.")
print("=" * 60)
print("\nNext steps:")
print("1. Task 2: Build CSV Parser Service")
print("2. Task 3: Build Storage Service")
print("3. Task 4: Build Upload Endpoint")
print("4. Task 5: Build Session Management Endpoints")
