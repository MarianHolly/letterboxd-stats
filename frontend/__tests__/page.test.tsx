import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '@/app/page';

// Mock fetch globally
global.fetch = jest.fn();

describe('Home Page - Upload Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the upload form', () => {
    render(<Home />);

    expect(screen.getByText('Letterboxd Quick Stats')).toBeInTheDocument();
    expect(screen.getByText('Upload Your Diary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload & Analyze/i })).toBeInTheDocument();
  });

  it('has disabled upload button when no file selected', () => {
    render(<Home />);

    const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
    expect(uploadButton).toBeDisabled();
  });

  it('enables upload button when file is selected', async () => {
    const user = userEvent.setup();
    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      expect(uploadButton).not.toBeDisabled();
    }
  });

  it('displays loading state while uploading', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      expect(screen.getByText(/Processing/i)).toBeInTheDocument();
    }
  });

  it('displays error when upload fails', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'CSV format invalid' }),
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/CSV format invalid/i)).toBeInTheDocument();
      });
    }
  });

  it('clears error when file is changed', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Some error' }),
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      // Upload file that fails
      const file1 = new File(['test'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file1);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/Some error/i)).toBeInTheDocument();
      });

      // Select new file
      const file2 = new File(['test2'], 'diary2.csv', { type: 'text/csv' });
      await user.upload(input, file2);

      // Error should be cleared
      expect(screen.queryByText(/Some error/i)).not.toBeInTheDocument();
    }
  });
});

describe('Home Page - Movie Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMovieData = {
    title: 'The Matrix',
    year: 1999,
    watched_date: '2024-01-15',
    rating: 5,
    tmdb_title: 'The Matrix',
    tmdb_id: 603,
    poster: 'https://image.tmdb.org/t/p/w500/test.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w1280/test-backdrop.jpg',
    overview: 'A computer hacker learns about reality.',
    tmdb_rating: 8.7,
    vote_count: 25000,
    release_date: '1999-03-31',
    genres: ['Science Fiction', 'Action'],
    runtime: 136,
    cast: [
      { name: 'Keanu Reeves', character: 'Neo' },
      { name: 'Laurence Fishburne', character: 'Morpheus' },
    ],
    directors: [
      { name: 'Lana Wachowski', job: 'Director' },
      { name: 'Lilly Wachowski', job: 'Director' },
    ],
  };

  it('displays movie data after successful upload', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.getByText('1999')).toBeInTheDocument();
        expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      });
    }
  });

  it('displays user rating when provided', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Your Rating')).toBeInTheDocument();
        expect(screen.getByText('5★')).toBeInTheDocument();
      });
    }
  });

  it('displays TMDB rating when available', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('TMDB Rating')).toBeInTheDocument();
        expect(screen.getByText(/8.7/)).toBeInTheDocument();
      });
    }
  });

  it('displays movie poster image', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        const imgs = screen.getAllByAltText('The Matrix');
        const posterImg = imgs.find(img => img.getAttribute('src') === mockMovieData.poster);
        expect(posterImg).toHaveAttribute('src', mockMovieData.poster);
      });
    }
  });

  it('displays overview text', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/A computer hacker learns about reality/)).toBeInTheDocument();
      });
    }
  });

  it('displays genres when available', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Science Fiction')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
      });
    }
  });

  it('displays runtime when available', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/136 min/)).toBeInTheDocument();
      });
    }
  });

  it('displays cast members when available', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Keanu Reeves')).toBeInTheDocument();
        expect(screen.getByText('as Neo')).toBeInTheDocument();
      });
    }
  });

  it('displays directors when available', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockMovieData,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Lana Wachowski')).toBeInTheDocument();
      });
    }
  });

  it('handles missing TMDB data gracefully', async () => {
    const user = userEvent.setup();
    const dataWithoutTMDB = {
      ...mockMovieData,
      tmdb_title: null,
      poster: null,
      backdrop: null,
      overview: null,
      tmdb_rating: null,
      release_date: null,
      genres: [],
      runtime: null,
      cast: [],
      directors: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithoutTMDB,
    });

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        // Should still show basic data
        expect(screen.getByText('The Matrix')).toBeInTheDocument();
        expect(screen.getByText('No poster available')).toBeInTheDocument();
      });
    }
  });
});

describe('Home Page - Network Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays helpful error when backend is not running', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    render(<Home />);

    const input = screen.getByRole('button', { name: /Upload & Analyze/i })
      .closest('div')
      ?.querySelector('input[type="file"]') as HTMLInputElement;

    if (input) {
      const file = new File(['test,csv,content'], 'diary.csv', { type: 'text/csv' });
      await user.upload(input, file);

      const uploadButton = screen.getByRole('button', { name: /Upload & Analyze/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
      });
    }
  });
});
