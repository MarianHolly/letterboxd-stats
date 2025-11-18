#!/usr/bin/env python
"""
Real-time enrichment progress monitor.

Shows active enrichment sessions with live progress bars, estimated time remaining,
and enrichment rate statistics.

Usage:
    python monitor_enrichment.py
    python monitor_enrichment.py --api http://custom-api:8000
    python monitor_enrichment.py --interval 1  # Refresh every 1 second
"""

import requests
import time
import sys
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass
import argparse
from pathlib import Path


@dataclass
class SessionProgress:
    """Represents enrichment progress for a single session."""
    session_id: str
    status: str
    enriched_count: int
    total_movies: int
    progress_percent: float
    created_at: str
    error_message: Optional[str] = None

    @property
    def remaining_movies(self) -> int:
        return self.total_movies - self.enriched_count

    @property
    def is_complete(self) -> bool:
        return self.status == "completed"

    @property
    def is_failed(self) -> bool:
        return self.status == "failed"

    @property
    def is_processing(self) -> bool:
        return self.status in ("processing", "enriching")


class EnrichmentMonitor:
    """Monitors enrichment progress in real-time."""

    def __init__(self, api_url: str = "http://localhost:8000", poll_interval: int = 2):
        self.api_url = api_url.rstrip("/")
        self.poll_interval = poll_interval
        self.previous_counts: Dict[str, int] = {}
        self.session_start_times: Dict[str, float] = {}

    def fetch_sessions(self) -> list[str]:
        """Fetch list of active session IDs (requires DB query or API endpoint)."""
        try:
            # Try to get all sessions - this assumes an endpoint exists
            # For now, we'll try to query known sessions or return empty
            # In production, the backend would need an /api/sessions endpoint
            return []
        except Exception as e:
            print(f"Error fetching sessions: {e}")
            return []

    def fetch_session_status(self, session_id: str) -> Optional[SessionProgress]:
        """Fetch enrichment status for a specific session."""
        try:
            response = requests.get(
                f"{self.api_url}/api/session/{session_id}",
                timeout=5
            )

            if response.status_code == 404:
                return None

            if response.status_code != 200:
                return None

            data = response.json()
            return SessionProgress(
                session_id=session_id,
                status=data.get("status", "unknown"),
                enriched_count=data.get("enriched_count", 0),
                total_movies=data.get("total_movies", 0),
                progress_percent=data.get("progress_percent", 0),
                created_at=data.get("created_at", ""),
                error_message=data.get("error_message"),
            )

        except requests.exceptions.RequestException as e:
            print(f"Error fetching session {session_id}: {e}")
            return None

    def calculate_rate(self, session_id: str, current_count: int) -> float:
        """Calculate movies per second enrichment rate."""
        if session_id not in self.session_start_times:
            self.session_start_times[session_id] = time.time()
            self.previous_counts[session_id] = 0

        elapsed = time.time() - self.session_start_times[session_id]
        if elapsed < 1:
            return 0

        previous = self.previous_counts.get(session_id, 0)
        rate = (current_count - previous) / elapsed if elapsed > 0 else 0
        return rate

    def estimate_time_remaining(
        self, session: SessionProgress, rate: float
    ) -> Optional[timedelta]:
        """Estimate time remaining based on current rate."""
        if rate <= 0 or session.remaining_movies <= 0:
            return None

        seconds_remaining = session.remaining_movies / rate
        return timedelta(seconds=seconds_remaining)

    def format_progress_bar(self, session: SessionProgress, width: int = 40) -> str:
        """Format a progress bar for display."""
        filled = int(width * session.progress_percent / 100)
        empty = width - filled

        if session.is_complete:
            bar = "█" * filled + "░" * empty
            color = "\033[92m"  # Green
            status = "✓ COMPLETE"
        elif session.is_failed:
            bar = "█" * filled + "░" * empty
            color = "\033[91m"  # Red
            status = "✗ FAILED"
        else:
            bar = "█" * filled + "░" * empty
            color = "\033[94m"  # Blue
            status = "⊙ ENRICHING"

        return f"{color}[{bar}] {status}\033[0m"

    def format_time(self, td: Optional[timedelta]) -> str:
        """Format timedelta to readable string."""
        if td is None:
            return "calculating..."

        total_seconds = int(td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, seconds = divmod(remainder, 60)

        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"

    def display_session(self, session: SessionProgress, rate: float = 0):
        """Display formatted session progress."""
        print(f"\n  Session: {session.session_id}")
        print(f"  {self.format_progress_bar(session)}")

        # Progress details
        progress_text = (
            f"  Progress: {session.enriched_count}/{session.total_movies} "
            f"({session.progress_percent:.1f}%)"
        )
        print(progress_text)

        # Rate and time remaining
        if session.is_processing:
            rate_text = f"  Rate: {rate:.2f} movies/sec" if rate > 0 else "  Rate: calculating..."
            print(rate_text)

            time_remaining = self.estimate_time_remaining(session, rate)
            time_text = (
                f"  Estimated time: {self.format_time(time_remaining)}"
                if time_remaining
                else "  Estimated time: calculating..."
            )
            print(time_text)

        # Status and error
        status_text = f"  Status: {session.status}"
        print(status_text)

        if session.error_message:
            print(f"  Error: {session.error_message}")

    def clear_screen(self):
        """Clear terminal screen."""
        os.system("cls" if os.name == "nt" else "clear")

    def run_interactive(self, session_ids: Optional[list[str]] = None):
        """Run in interactive mode, continuously monitoring sessions."""
        if not session_ids:
            print("\n❌ No session IDs provided.")
            print("\nUsage:")
            print("  python monitor_enrichment.py <session_id>")
            print("  python monitor_enrichment.py <session_id_1> <session_id_2> ...")
            print("\nExample:")
            print("  python monitor_enrichment.py 0ce3a96c-1234-5678-90ab-cdef12345678")
            return

        print(f"\n📊 Monitoring {len(session_ids)} session(s)...")
        print(f"API: {self.api_url}")
        print(f"Poll interval: {self.poll_interval}s")
        print("\nPress Ctrl+C to exit\n")
        print("=" * 70)

        cycle = 0
        try:
            while True:
                self.clear_screen()
                print("=" * 70)
                print(f"🎬 Letterboxd Enrichment Monitor")
                print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print("=" * 70)

                all_complete = True
                for session_id in session_ids:
                    session = self.fetch_session_status(session_id)

                    if session is None:
                        print(f"\n❌ Session not found: {session_id}")
                        continue

                    if not session.is_complete and not session.is_failed:
                        all_complete = False

                    # Calculate rate (movies enriched per second in this cycle)
                    rate = self.calculate_rate(session.session_id, session.enriched_count)
                    self.display_session(session, rate)

                print("\n" + "=" * 70)

                if all_complete:
                    print("✅ All sessions complete! Press Ctrl+C to exit.")

                cycle += 1
                time.sleep(self.poll_interval)

        except KeyboardInterrupt:
            print("\n\n👋 Monitoring stopped.")
            sys.exit(0)


def main():
    parser = argparse.ArgumentParser(
        description="Monitor Letterboxd enrichment progress in real-time",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Monitor a single session
  python monitor_enrichment.py 0ce3a96c-b479-4e90-8b5d-a67e9450336c

  # Monitor multiple sessions
  python monitor_enrichment.py 907bf841-b479-4e90-8b5d-a67e9450336c 0ce3a96c-b479-4e90-8b5d-a67e9450336c

  # Custom API URL
  python monitor_enrichment.py --api http://api.example.com:8000 <session_id>

  # Faster refresh (every 1 second)
  python monitor_enrichment.py --interval 1 <session_id>
        """
    )

    parser.add_argument(
        "session_ids",
        nargs="*",
        help="Session ID(s) to monitor"
    )

    parser.add_argument(
        "--api",
        default="http://localhost:8000",
        help="API URL (default: http://localhost:8000)"
    )

    parser.add_argument(
        "--interval",
        type=int,
        default=2,
        help="Poll interval in seconds (default: 2)"
    )

    args = parser.parse_args()

    if not args.session_ids:
        print("\n❌ Error: Session ID(s) required")
        print("\nUsage: python monitor_enrichment.py <session_id> [<session_id_2> ...]")
        print("\nExample:")
        print("  python monitor_enrichment.py 0ce3a96c-b479-4e90-8b5d-a67e9450336c")
        sys.exit(1)

    monitor = EnrichmentMonitor(api_url=args.api, poll_interval=args.interval)
    monitor.run_interactive(session_ids=args.session_ids)


if __name__ == "__main__":
    main()
