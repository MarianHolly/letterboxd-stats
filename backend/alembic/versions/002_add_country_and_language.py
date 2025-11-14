"""
Add country and original_language columns to movies table

Revision ID: 002
Revises: 001
Create Date: 2024-11-12

This migration adds TMDB enrichment fields for:
- country: Primary production country of the movie
- original_language: Original language code (e.g., 'en', 'ja', 'fr')

These fields are populated by the TMDB enrichment worker during Phase 3.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add country and original_language columns to movies table"""
    # Add country column
    op.add_column(
        'movies',
        sa.Column('country', sa.String(100), nullable=True)
    )

    # Add original_language column
    op.add_column(
        'movies',
        sa.Column('original_language', sa.String(10), nullable=True)
    )


def downgrade() -> None:
    """Remove country and original_language columns from movies table"""
    # Drop original_language column
    op.drop_column('movies', 'original_language')

    # Drop country column
    op.drop_column('movies', 'country')
