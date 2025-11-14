#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Diagnostic script to test enrichment worker startup
Run this to verify the worker can start without errors
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    sys.stdout.reconfigure(encoding='utf-8')

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment
load_dotenv()
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

def test_imports():
    """Test that all imports work"""
    print("\n" + "="*60)
    print("TEST 1: Checking imports...")
    print("="*60)

    try:
        from app.db.session import SessionLocal, init_db
        print("[OK] SessionLocal imported")

        from app.services.tmdb_client import TMDBClient
        print("[OK] TMDBClient imported")

        from app.services.enrichment_worker import EnrichmentWorker
        print("[OK] EnrichmentWorker imported")

        return True
    except Exception as e:
        print(f"[ERROR] Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database():
    """Test database connection"""
    print("\n" + "="*60)
    print("TEST 2: Testing database connection...")
    print("="*60)

    try:
        from app.db.session import SessionLocal
        db = SessionLocal()

        # Try a simple query
        from app.models.database import Session as SessionModel
        result = db.query(SessionModel).first()
        print(f"[OK] Database connected, query succeeded")
        db.close()
        return True
    except Exception as e:
        print(f"[ERROR] Database test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_tmdb_client():
    """Test TMDB client initialization"""
    print("\n" + "="*60)
    print("TEST 3: Testing TMDB client...")
    print("="*60)

    if not TMDB_API_KEY:
        print("[ERROR] TMDB_API_KEY not set in environment")
        return False

    try:
        from app.services.tmdb_client import TMDBClient
        client = TMDBClient(TMDB_API_KEY)
        print(f"[OK] TMDBClient initialized successfully")
        return True
    except Exception as e:
        print(f"[ERROR] TMDBClient initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_enrichment_worker():
    """Test enrichment worker initialization and startup"""
    print("\n" + "="*60)
    print("TEST 4: Testing EnrichmentWorker...")
    print("="*60)

    try:
        from app.db.session import SessionLocal
        from app.services.tmdb_client import TMDBClient
        from app.services.enrichment_worker import EnrichmentWorker

        logger.info("Creating TMDBClient...")
        tmdb_client = TMDBClient(TMDB_API_KEY)

        logger.info("Creating EnrichmentWorker with SessionLocal factory...")
        worker = EnrichmentWorker(tmdb_client, SessionLocal)
        print(f"[OK] EnrichmentWorker created successfully")

        logger.info("Starting scheduler...")
        worker.start_scheduler()
        print(f"[OK] Scheduler started successfully")

        # Check status
        status = worker.get_status()
        print(f"[OK] Worker status: {status}")

        # Stop it
        worker.stop_scheduler()
        print(f"[OK] Scheduler stopped successfully")

        return True
    except Exception as e:
        print(f"[ERROR] EnrichmentWorker test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("ENRICHMENT WORKER STARTUP DIAGNOSTICS")
    print("="*60)

    results = []

    # Test 1: Imports
    results.append(("Imports", test_imports()))

    # Test 2: Database
    results.append(("Database", test_database()))

    # Test 3: TMDB Client
    results.append(("TMDB Client", test_tmdb_client()))

    # Test 4: EnrichmentWorker
    results.append(("EnrichmentWorker", test_enrichment_worker()))

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    for test_name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{test_name:20} {status}")

    all_passed = all(result for _, result in results)

    print("\n" + "="*60)
    if all_passed:
        print("[OK] ALL TESTS PASSED - Worker should start correctly")
        print("     Start backend with: python -m uvicorn main:app --reload")
    else:
        print("[ERROR] SOME TESTS FAILED - See errors above")
        sys.exit(1)
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
