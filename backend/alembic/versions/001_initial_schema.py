"""
Initial schema: Create sessions and movies tables

Revision ID: 001
Revises: None
Create Date: 2024-11-12

This is the initial migration that creates the foundation schema:
- sessions table: Stores upload session metadata
- movies table: Stores parsed movie data from CSVs

Why these two tables?
- One-to-many relationship (1 session has many movies)
- Easy to clean up old sessions (cascade delete removes movies too)
- Efficient queries (filter by session_id, then get movies)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create initial schema
    """
    # Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('last_accessed', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='processing'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('total_movies', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('enriched_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('upload_metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create movies table
    op.create_table(
        'movies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('watched_date', sa.DateTime(), nullable=True),
        sa.Column('rewatch', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('tags', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('review', sa.Text(), nullable=True),
        sa.Column('letterboxd_uri', sa.String(500), nullable=False),
        sa.Column('tmdb_enriched', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('tmdb_id', sa.Integer(), nullable=True),
        sa.Column('genres', sa.JSON(), nullable=True),
        sa.Column('directors', sa.JSON(), nullable=True),
        sa.Column('cast', sa.JSON(), nullable=True),
        sa.Column('runtime', sa.Integer(), nullable=True),
        sa.Column('budget', sa.Integer(), nullable=True),
        sa.Column('revenue', sa.Integer(), nullable=True),
        sa.Column('popularity', sa.Float(), nullable=True),
        sa.Column('vote_average', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('enriched_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Create index on session_id for fast movie lookups
    op.create_index('ix_movies_session_id', 'movies', ['session_id'])

    # Create index on letterboxd_uri for deduplication
    op.create_index('ix_movies_letterboxd_uri', 'movies', ['letterboxd_uri'])

    # Create index on expires_at for cleanup queries
    op.create_index('ix_sessions_expires_at', 'sessions', ['expires_at'])


def downgrade() -> None:
    """
    Drop schema (revert to before this migration)
    """
    # Drop indexes
    op.drop_index('ix_sessions_expires_at', table_name='sessions')
    op.drop_index('ix_movies_letterboxd_uri', table_name='movies')
    op.drop_index('ix_movies_session_id', table_name='movies')

    # Drop tables (movies first due to foreign key)
    op.drop_table('movies')
    op.drop_table('sessions')
