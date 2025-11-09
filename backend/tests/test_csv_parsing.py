"""
Tests for CSV parsing functionality
"""
import pytest
import pandas as pd
import io
from datetime import datetime


class TestCSVParsing:
    """Test CSV parsing and validation"""

    @pytest.fixture
    def valid_csv_content(self):
        """Sample valid diary.csv content"""
        return """Name,Year,Watched Date,Rating
The Matrix,1999,2024-01-15,5
Inception,2010,2024-01-10,4.5
Pulp Fiction,1994,2024-01-05,4
"""

    @pytest.fixture
    def csv_without_watched_date(self):
        """CSV missing Watched Date column"""
        return """Name,Year,Rating
The Matrix,1999,5
Inception,2010,4.5
"""

    @pytest.fixture
    def csv_without_name(self):
        """CSV missing Name column"""
        return """Year,Watched Date,Rating
1999,2024-01-15,5
2010,2024-01-10,4.5
"""

    @pytest.fixture
    def empty_csv(self):
        """Empty CSV file"""
        return ""

    def test_valid_csv_parsing(self, valid_csv_content):
        """Test that valid CSV is parsed correctly"""
        df = pd.read_csv(io.StringIO(valid_csv_content))

        assert len(df) == 3
        assert list(df.columns) == ['Name', 'Year', 'Watched Date', 'Rating']
        assert df.iloc[0]['Name'] == 'The Matrix'
        assert df.iloc[0]['Year'] == 1999

    def test_csv_column_validation_watched_date(self, valid_csv_content):
        """Test validation of Watched Date column"""
        df = pd.read_csv(io.StringIO(valid_csv_content))
        assert 'Watched Date' in df.columns

    def test_csv_column_validation_name(self, valid_csv_content):
        """Test validation of Name column"""
        df = pd.read_csv(io.StringIO(valid_csv_content))
        assert 'Name' in df.columns

    def test_csv_missing_watched_date_column(self, csv_without_watched_date):
        """Test that missing Watched Date column is detected"""
        df = pd.read_csv(io.StringIO(csv_without_watched_date))
        assert 'Watched Date' not in df.columns

    def test_csv_missing_name_column(self, csv_without_name):
        """Test that missing Name column is detected"""
        df = pd.read_csv(io.StringIO(csv_without_name))
        assert 'Name' not in df.columns

    def test_csv_date_parsing(self, valid_csv_content):
        """Test that dates are parsed correctly"""
        df = pd.read_csv(io.StringIO(valid_csv_content))
        df['Watched Date'] = pd.to_datetime(df['Watched Date'])

        assert df.iloc[0]['Watched Date'] == pd.Timestamp('2024-01-15')
        assert isinstance(df.iloc[0]['Watched Date'], pd.Timestamp)

    def test_csv_date_sorting(self, valid_csv_content):
        """Test that dates can be sorted correctly"""
        df = pd.read_csv(io.StringIO(valid_csv_content))
        df['Watched Date'] = pd.to_datetime(df['Watched Date'])
        df_sorted = df.sort_values('Watched Date', ascending=False)

        # Most recent should be first
        assert df_sorted.iloc[0]['Name'] == 'The Matrix'
        # Oldest should be last
        assert df_sorted.iloc[2]['Name'] == 'Pulp Fiction'

    def test_csv_get_most_recent_movie(self, valid_csv_content):
        """Test extraction of most recent movie"""
        df = pd.read_csv(io.StringIO(valid_csv_content))
        df['Watched Date'] = pd.to_datetime(df['Watched Date'])
        df = df.sort_values('Watched Date', ascending=False)

        recent = df.iloc[0]
        assert recent['Name'] == 'The Matrix'
        assert recent['Year'] == 1999

    def test_csv_null_rating_handling(self):
        """Test handling of missing rating values"""
        csv_content = """Name,Year,Watched Date,Rating
The Matrix,1999,2024-01-15,5
Inception,2010,2024-01-10,
Pulp Fiction,1994,2024-01-05,4
"""
        df = pd.read_csv(io.StringIO(csv_content))

        # Test that null is recognized
        assert pd.isna(df.iloc[1]['Rating'])

        # Test conversion logic
        rating = float(df.iloc[1]['Rating']) if pd.notna(df.iloc[1]['Rating']) else None
        assert rating is None

    def test_csv_type_conversion(self, valid_csv_content):
        """Test type conversion for movie data"""
        df = pd.read_csv(io.StringIO(valid_csv_content))
        df['Watched Date'] = pd.to_datetime(df['Watched Date'])

        recent = df.iloc[0]

        title = str(recent['Name']).strip()
        year = int(recent['Year']) if 'Year' in recent and pd.notna(recent['Year']) else None
        watched_date = str(recent['Watched Date'].date())
        rating = float(recent['Rating']) if 'Rating' in recent and pd.notna(recent['Rating']) else None

        assert isinstance(title, str)
        assert isinstance(year, int)
        assert isinstance(watched_date, str)
        assert isinstance(rating, float) or rating is None

    def test_empty_csv_handling(self):
        """Test handling of empty CSV"""
        with pytest.raises(Exception):
            # Empty CSV should cause an error when trying to access first row
            df = pd.read_csv(io.StringIO(""))
            if len(df) == 0:
                raise IndexError("No data in CSV")

    def test_csv_with_special_characters(self):
        """Test CSV with special characters in titles"""
        csv_content = """Name,Year,Watched Date,Rating
L'Avventura,1960,2024-01-15,4.5
Crouching Tiger, Hidden Dragon,2000,2024-01-10,5
The 7th Seal,1957,2024-01-05,4
"""
        df = pd.read_csv(io.StringIO(csv_content))

        assert df.iloc[0]['Name'] == "L'Avventura"
        assert df.iloc[1]['Name'] == "Crouching Tiger, Hidden Dragon"
        assert len(df) == 3
