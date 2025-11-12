"""
UPDATED CSV Parser Service for Letterboxd Data - v2.0

CRITICAL CHANGES FROM v1:
1. Letterboxd URI is now the PRIMARY key (not title+year)
2. Supports MULTIPLE watches per movie (tracks rewatches)
3. Separate date tracking: date_rated, diary_entry_date, watched_date, date_liked
4. NEW: Likes.csv support
5. Better alignment with frontend's normalized data structure

Reference: See BACKEND_CSV_PARSER_ANALYSIS.md for design decisions
"""

import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional, Any, BinaryIO
import logging

logger = logging.getLogger(__name__)


class LetterboxdParser:
    """
    Updated parser for Letterboxd CSV exports - v2.0

    Key Improvements:
    - Uses Letterboxd URI as unique identifier (not title+year)
    - Tracks multiple watches per movie (rewatches)
    - Complete date tracking (watched_date, date_rated, diary_entry_date, date_liked)
    - Supports likes.csv
    - Returns data structure that matches frontend EnrichedData

    Data Structure:
    The parser organizes data by Letterboxd URI (unique movie identifier):

    {
        'https://boxd.it/1skk': {  ← Letterboxd URI is the unique key
            'movie': {
                'uri': 'https://boxd.it/1skk',
                'title': 'Inception',
                'year': 2010,
            },
            'watches': [
                {
                    'watched_date': datetime,
                    'diary_entry_date': datetime,  # When diary was posted
                    'rating': 5.0,
                    'rewatch': False,
                    'tags': ['sci-fi', 'mind-bending'],
                    'review': 'Amazing film'
                },
                {
                    'watched_date': datetime,  # Second watch (rewatch)
                    'diary_entry_date': datetime,
                    'rating': 4.5,
                    'rewatch': True,
                    'tags': ['sci-fi'],
                    'review': None
                }
            ],
            'ratings': [
                {
                    'rating': 5.0,
                    'date_rated': datetime,  # When they rated it
                }
            ],
            'likes': [
                {
                    'date_liked': datetime
                }
            ]
        }
    }

    Why Letterboxd URI?
    - Unique identifier for movies (not title+year which can duplicate)
    - Same movie can have different titles across regions
    - Allows accurate tracking even if user renames/typos movie name
    """

    # Expected columns for each CSV type
    # Note: Letterboxd exports all have a Date column with different meanings:
    WATCHED_REQUIRED = ['Name', 'Year', 'Letterboxd URI']
    RATINGS_REQUIRED = ['Name', 'Year', 'Rating', 'Letterboxd URI']
    DIARY_REQUIRED = ['Name', 'Year', 'Watched Date']  # Date column is optional
    LIKES_REQUIRED = ['Name', 'Year', 'Letterboxd URI']

    def __init__(self):
        """Initialize parser"""
        self.errors: List[str] = []

    # ============================================================
    # PUBLIC API - These are the main parsing methods
    # ============================================================

    def parse_watched(self, file_obj: BinaryIO) -> Dict[str, Dict[str, Any]]:
        """
        Parse watched.csv (viewing history)

        Format:
            Date,Name,Year,Letterboxd URI
            2023-01-15,Inception,2010,https://boxd.it/1skk

        Returns:
            Dictionary keyed by Letterboxd URI with watch entries
        """
        try:
            df = pd.read_csv(file_obj)
            self._validate_columns(df, self.WATCHED_REQUIRED, 'watched.csv')

            movies_by_uri: Dict[str, Dict[str, Any]] = {}

            for idx, row in df.iterrows():
                uri = self._get_letterboxd_uri(row)
                if not uri:
                    self.errors.append(f"Row {idx + 2}: Missing Letterboxd URI")
                    continue

                title = str(row['Name']).strip()
                year = self._parse_year(row.get('Year'))

                # Create or get movie entry
                if uri not in movies_by_uri:
                    movies_by_uri[uri] = {
                        'movie': {'uri': uri, 'title': title, 'year': year},
                        'watches': [],
                        'ratings': [],
                        'likes': []
                    }

                # Parse watch entry
                watched_date = self._parse_date(row.get('Date'))
                if not watched_date:
                    self.errors.append(f"Row {idx + 2}: Invalid or missing date for {title}")
                    continue

                # Add watch entry
                movies_by_uri[uri]['watches'].append({
                    'watched_date': watched_date,
                    'rating': None,
                    'rewatch': False,
                    'tags': [],
                    'review': None
                })

            logger.info(f"Parsed watched.csv: {len(movies_by_uri)} movies with {sum(len(m['watches']) for m in movies_by_uri.values())} watches")
            return movies_by_uri

        except Exception as e:
            error_msg = f"Error parsing watched.csv: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise ValueError(error_msg)

    def parse_ratings(self, file_obj: BinaryIO) -> Dict[str, Dict[str, Any]]:
        """
        Parse ratings.csv (rating history)

        Format:
            Date,Name,Year,Letterboxd URI,Rating
            2023-01-15,Inception,2010,https://boxd.it/1skk,5

        Key: The Date column is when the RATING was made, not when watched!

        Returns:
            Dictionary keyed by Letterboxd URI with rating entries
        """
        try:
            df = pd.read_csv(file_obj)
            self._validate_columns(df, self.RATINGS_REQUIRED, 'ratings.csv')

            movies_by_uri: Dict[str, Dict[str, Any]] = {}

            for idx, row in df.iterrows():
                uri = self._get_letterboxd_uri(row)
                if not uri:
                    self.errors.append(f"Row {idx + 2}: Missing Letterboxd URI")
                    continue

                title = str(row['Name']).strip()
                year = self._parse_year(row.get('Year'))

                # Create or get movie entry
                if uri not in movies_by_uri:
                    movies_by_uri[uri] = {
                        'movie': {'uri': uri, 'title': title, 'year': year},
                        'watches': [],
                        'ratings': [],
                        'likes': []
                    }

                # Parse rating entry
                rating = self._normalize_rating(row.get('Rating'))
                date_rated = self._parse_date(row.get('Date'))  # When they rated it

                if rating is not None:
                    movies_by_uri[uri]['ratings'].append({
                        'rating': rating,
                        'date_rated': date_rated
                    })

            logger.info(f"Parsed ratings.csv: {len(movies_by_uri)} movies with {sum(len(m['ratings']) for m in movies_by_uri.values())} ratings")
            return movies_by_uri

        except Exception as e:
            error_msg = f"Error parsing ratings.csv: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise ValueError(error_msg)

    def parse_diary(self, file_obj: BinaryIO) -> Dict[str, Dict[str, Any]]:
        """
        Parse diary.csv (detailed diary entries)

        Format:
            Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date
            2023-01-15,Inception,2010,https://boxd.it/1skk,5,,sci-fi;mind-bending,2023-01-15

        Key: TWO dates!
        - Date = When diary entry was posted
        - Watched Date = When the movie was actually watched

        Returns:
            Dictionary keyed by Letterboxd URI with diary entries
        """
        try:
            df = pd.read_csv(file_obj)
            self._validate_columns(df, self.DIARY_REQUIRED, 'diary.csv')

            movies_by_uri: Dict[str, Dict[str, Any]] = {}

            for idx, row in df.iterrows():
                uri = self._get_letterboxd_uri(row)
                if not uri:
                    self.errors.append(f"Row {idx + 2}: Missing Letterboxd URI")
                    continue

                title = str(row['Name']).strip()
                year = self._parse_year(row.get('Year'))

                # Create or get movie entry
                if uri not in movies_by_uri:
                    movies_by_uri[uri] = {
                        'movie': {'uri': uri, 'title': title, 'year': year},
                        'watches': [],
                        'ratings': [],
                        'likes': []
                    }

                # Parse dates
                watched_date = self._parse_date(row.get('Watched Date'))
                diary_entry_date = self._parse_date(row.get('Date'))

                if not watched_date:
                    self.errors.append(f"Row {idx + 2}: Invalid or missing Watched Date for {title}")
                    continue

                # Parse other fields
                rating = self._normalize_rating(row.get('Rating'))
                rewatch = self._parse_boolean(row.get('Rewatch'))
                tags = self._parse_tags(row.get('Tags'))
                review = str(row.get('Review')).strip() if pd.notna(row.get('Review')) else None

                # Add watch entry
                movies_by_uri[uri]['watches'].append({
                    'watched_date': watched_date,
                    'diary_entry_date': diary_entry_date,
                    'rating': rating,
                    'rewatch': rewatch,
                    'tags': tags,
                    'review': review
                })

            logger.info(f"Parsed diary.csv: {len(movies_by_uri)} movies with {sum(len(m['watches']) for m in movies_by_uri.values())} diary entries")
            return movies_by_uri

        except Exception as e:
            error_msg = f"Error parsing diary.csv: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise ValueError(error_msg)

    def parse_likes(self, file_obj: BinaryIO) -> Dict[str, Dict[str, Any]]:
        """
        Parse likes.csv (liked movies)

        Format:
            Date,Name,Year,Letterboxd URI
            2023-01-15,Inception,2010,https://boxd.it/1skk

        Returns:
            Dictionary keyed by Letterboxd URI with like entries
        """
        try:
            df = pd.read_csv(file_obj)
            self._validate_columns(df, self.LIKES_REQUIRED, 'likes.csv')

            movies_by_uri: Dict[str, Dict[str, Any]] = {}

            for idx, row in df.iterrows():
                uri = self._get_letterboxd_uri(row)
                if not uri:
                    self.errors.append(f"Row {idx + 2}: Missing Letterboxd URI")
                    continue

                title = str(row['Name']).strip()
                year = self._parse_year(row.get('Year'))

                # Create or get movie entry
                if uri not in movies_by_uri:
                    movies_by_uri[uri] = {
                        'movie': {'uri': uri, 'title': title, 'year': year},
                        'watches': [],
                        'ratings': [],
                        'likes': []
                    }

                # Parse like entry
                date_liked = self._parse_date(row.get('Date'))
                if date_liked:
                    movies_by_uri[uri]['likes'].append({
                        'date_liked': date_liked
                    })

            logger.info(f"Parsed likes.csv: {len(movies_by_uri)} movies with {sum(len(m['likes']) for m in movies_by_uri.values())} likes")
            return movies_by_uri

        except Exception as e:
            error_msg = f"Error parsing likes.csv: {str(e)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise ValueError(error_msg)

    def merge_all(self, *movie_dicts: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Merge multiple parsed file results into one

        Args:
            *movie_dicts: Variable number of movie dictionaries from parse_* methods

        Returns:
            Merged dictionary with all data for each unique movie (by URI)

        Merge Strategy:
        - Key by Letterboxd URI (unique identifier)
        - Combine watches, ratings, and likes for same movie
        - Later sources can enhance earlier data (e.g., diary can add tags to watched)
        """
        merged: Dict[str, Dict[str, Any]] = {}

        for movie_dict in movie_dicts:
            for uri, movie_data in movie_dict.items():
                if uri not in merged:
                    # First time seeing this movie
                    merged[uri] = {
                        'movie': movie_data['movie'],
                        'watches': movie_data['watches'].copy(),
                        'ratings': movie_data['ratings'].copy(),
                        'likes': movie_data['likes'].copy()
                    }
                else:
                    # Merge additional data for this movie
                    merged[uri]['watches'].extend(movie_data['watches'])
                    merged[uri]['ratings'].extend(movie_data['ratings'])
                    merged[uri]['likes'].extend(movie_data['likes'])

        logger.info(f"Merged into {len(merged)} unique movies")
        return merged

    # ============================================================
    # HELPER METHODS
    # ============================================================

    def _get_letterboxd_uri(self, row: pd.Series) -> Optional[str]:
        """
        Extract Letterboxd URI from row (unique movie identifier)

        Letterboxd URIs are the canonical identifier for movies.
        Format: https://boxd.it/XXXX or https://letterboxd.com/film/...
        """
        if pd.notna(row.get('Letterboxd URI')):
            uri = str(row['Letterboxd URI']).strip()
            if uri:
                return uri
        return None

    def _parse_year(self, year_value: Any) -> Optional[int]:
        """
        Parse year safely

        Validates: 1800 <= year <= current_year + 5
        """
        if pd.isna(year_value) or year_value == '':
            return None

        try:
            year = int(year_value)
            current_year = datetime.now().year
            # Allow future years (unreleased films) but with limits
            if 1800 <= year <= current_year + 5:
                return year
            logger.warning(f"Year out of reasonable range: {year}")
            return None
        except (ValueError, TypeError):
            logger.warning(f"Could not parse year: {year_value}")
            return None

    def _parse_date(self, date_value: Any) -> Optional[datetime]:
        """
        Parse date in multiple formats

        Tries formats in order:
        1. ISO format: 2024-01-15
        2. US format: 01/15/2024
        3. European format: 15/01/2024
        4. Text format: Jan 15, 2024
        """
        if pd.isna(date_value) or date_value == '':
            return None

        date_str = str(date_value).strip()

        formats = [
            '%Y-%m-%d',          # ISO: 2024-01-15
            '%m/%d/%Y',          # US: 01/15/2024
            '%d/%m/%Y',          # EU: 15/01/2024
            '%b %d, %Y',         # Text: Jan 15, 2024
            '%B %d, %Y',         # Text: January 15, 2024
            '%d-%m-%Y',          # EU alt: 15-01-2024
            '%Y/%m/%d',          # Alt ISO: 2024/01/15
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        logger.warning(f"Could not parse date: {date_str}")
        return None

    def _normalize_rating(self, rating_value: Any) -> Optional[float]:
        """
        Normalize rating to 0.5-5.0 scale

        Handles:
        - Float: 4.5, 5.0
        - Integer: 1, 2, 3, 4, 5
        - Stars: ★★★★½ (count stars)
        - Out of range: Sets to None
        """
        if pd.isna(rating_value) or rating_value == '' or rating_value == 'None':
            return None

        try:
            rating_str = str(rating_value).strip()

            if rating_str.lower() in ['unrated', 'none', '']:
                return None

            # Handle star notation (★★★★½ = 4.5)
            if '★' in rating_str:
                star_count = rating_str.count('★')
                if '½' in rating_str:
                    return float(star_count) + 0.5
                return float(star_count)

            # Convert to float
            rating = float(rating_str)

            # Validate range
            if rating < 0.5 or rating > 5.0:
                logger.warning(f"Rating {rating} out of 0.5-5.0 range")
                return None

            # Round to nearest 0.5 (Letterboxd uses half-stars)
            return round(rating * 2) / 2

        except (ValueError, AttributeError, TypeError) as e:
            logger.warning(f"Could not parse rating '{rating_value}': {str(e)}")
            return None

    def _parse_tags(self, tags_value: Any) -> List[str]:
        """
        Parse tags from semicolon-separated string

        Format: "sci-fi;action;favorite"
        Returns: ["sci-fi", "action", "favorite"]
        """
        if pd.isna(tags_value) or tags_value == '':
            return []

        tags_str = str(tags_value).strip()
        if not tags_str:
            return []

        # Split by semicolon and strip whitespace
        tags = [tag.strip() for tag in tags_str.split(';')]
        return [tag for tag in tags if tag]  # Remove empty strings

    def _parse_boolean(self, bool_value: Any) -> bool:
        """
        Parse boolean from various string formats

        Accepts: "Yes", "No", "True", "False", "x", "✓", 1, 0
        """
        if pd.isna(bool_value):
            return False

        bool_str = str(bool_value).strip().lower()
        return bool_str in ['yes', 'true', '1', 'y', 'x', '✓']

    def _validate_columns(self, df: pd.DataFrame, required_columns: List[str], filename: str):
        """
        Validate that DataFrame has required columns

        Raises:
            ValueError: If required columns are missing
        """
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            error_msg = f"{filename} missing required columns: {missing}. Found: {list(df.columns)}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            raise ValueError(error_msg)
