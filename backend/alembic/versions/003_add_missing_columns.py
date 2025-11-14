"""
Add missing columns to movies table

Revision ID: 003
Revises: 002
Create Date: 2025-11-14

This migration adds missing columns that should have been created in the initial
schema but were not applied to the database:
- rating: User's rating (0.5 to 5.0)
- watched_date: When the user watched the movie
- rewatch: Whether this was a rewatch
- tags: User-assigned tags
- review: User's written review text
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add missing columns to movies table"""
    # Add rating column
    op.add_column(
        'movies',
        sa.Column('rating', sa.Float(), nullable=True)
    )

    # Add watched_date column
    op.add_column(
        'movies',
        sa.Column('watched_date', sa.DateTime(), nullable=True)
    )

    # Add rewatch column
    op.add_column(
        'movies',
        sa.Column('rewatch', sa.Boolean(), nullable=False, server_default='false')
    )

    # Add tags column
    op.add_column(
        'movies',
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]')
    )

    # Add review column
    op.add_column(
        'movies',
        sa.Column('review', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    """Remove missing columns from movies table"""
    # Drop review column
    op.drop_column('movies', 'review')

    # Drop tags column
    op.drop_column('movies', 'tags')

    # Drop rewatch column
    op.drop_column('movies', 'rewatch')

    # Drop watched_date column
    op.drop_column('movies', 'watched_date')

    # Drop rating column
    op.drop_column('movies', 'rating')
