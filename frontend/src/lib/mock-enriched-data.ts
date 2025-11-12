/*
Mock enriched data for testing and marketing showcase
Demonstrates various analytics patterns:
- Year-round viewing activity
- Seasonal patterns (more movies in winter/holidays)
- Consistent engagement across years
- Diverse rating distribution
*/

import { EnrichedData } from './data-processors';

export const mockEnrichedData: EnrichedData = {
  movies: new Map([
    // Sample movies
    ['the_dark_knight_2008', {
      id: 'the_dark_knight_2008',
      name: 'The Dark Knight',
      year: 2008,
      letterboxdUri: 'https://boxd.it/2b0k',
    }],
    ['inception_2010', {
      id: 'inception_2010',
      name: 'Inception',
      year: 2010,
      letterboxdUri: 'https://boxd.it/1skk',
    }],
    ['the_prestige_2006', {
      id: 'the_prestige_2006',
      name: 'The Prestige',
      year: 2006,
      letterboxdUri: 'https://boxd.it/293w',
    }],
    ['parasite_2019', {
      id: 'parasite_2019',
      name: 'Parasite',
      year: 2019,
      letterboxdUri: 'https://boxd.it/xyz',
    }],
    ['everything_everywhere_all_at_once_2022', {
      id: 'everything_everywhere_all_at_once_2022',
      name: 'Everything Everywhere All At Once',
      year: 2022,
      letterboxdUri: 'https://boxd.it/abc',
    }],
  ]),

  // Watch history (spread across 5 years)
  watchHistory: [
    // 2020 - Started tracking
    { movieId: 'the_dark_knight_2008', date: new Date('2020-02-10'), dateISO: '2020-02-10' },
    { movieId: 'inception_2010', date: new Date('2020-03-15'), dateISO: '2020-03-15' },
    { movieId: 'the_prestige_2006', date: new Date('2020-04-20'), dateISO: '2020-04-20' },
    { movieId: 'parasite_2019', date: new Date('2020-05-08'), dateISO: '2020-05-08' },
    { movieId: 'the_dark_knight_2008', date: new Date('2020-06-12'), dateISO: '2020-06-12' },
    { movieId: 'inception_2010', date: new Date('2020-07-18'), dateISO: '2020-07-18' },
    { movieId: 'the_prestige_2006', date: new Date('2020-08-25'), dateISO: '2020-08-25' },
    { movieId: 'parasite_2019', date: new Date('2020-09-30'), dateISO: '2020-09-30' },
    { movieId: 'the_dark_knight_2008', date: new Date('2020-10-15'), dateISO: '2020-10-15' },
    { movieId: 'inception_2010', date: new Date('2020-11-20'), dateISO: '2020-11-20' },
    { movieId: 'the_prestige_2006', date: new Date('2020-12-28'), dateISO: '2020-12-28' },
    { movieId: 'parasite_2019', date: new Date('2020-12-30'), dateISO: '2020-12-30' },

    // 2021 - Regular viewing
    { movieId: 'the_dark_knight_2008', date: new Date('2021-01-12'), dateISO: '2021-01-12' },
    { movieId: 'inception_2010', date: new Date('2021-02-08'), dateISO: '2021-02-08' },
    { movieId: 'the_prestige_2006', date: new Date('2021-03-15'), dateISO: '2021-03-15' },
    { movieId: 'parasite_2019', date: new Date('2021-04-02'), dateISO: '2021-04-02' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2021-05-10'), dateISO: '2021-05-10' },
    { movieId: 'the_dark_knight_2008', date: new Date('2021-06-18'), dateISO: '2021-06-18' },
    { movieId: 'inception_2010', date: new Date('2021-07-22'), dateISO: '2021-07-22' },
    { movieId: 'the_prestige_2006', date: new Date('2021-08-30'), dateISO: '2021-08-30' },
    { movieId: 'parasite_2019', date: new Date('2021-09-14'), dateISO: '2021-09-14' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2021-10-25'), dateISO: '2021-10-25' },
    { movieId: 'the_dark_knight_2008', date: new Date('2021-11-08'), dateISO: '2021-11-08' },
    { movieId: 'inception_2010', date: new Date('2021-12-20'), dateISO: '2021-12-20' },

    // 2022 - Active viewing
    { movieId: 'the_dark_knight_2008', date: new Date('2022-01-15'), dateISO: '2022-01-15' },
    { movieId: 'inception_2010', date: new Date('2022-01-20'), dateISO: '2022-01-20' },
    { movieId: 'the_prestige_2006', date: new Date('2022-02-10'), dateISO: '2022-02-10' },
    { movieId: 'parasite_2019', date: new Date('2022-03-05'), dateISO: '2022-03-05' },
    { movieId: 'the_dark_knight_2008', date: new Date('2022-03-12'), dateISO: '2022-03-12' },
    { movieId: 'inception_2010', date: new Date('2022-04-08'), dateISO: '2022-04-08' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2022-05-15'), dateISO: '2022-05-15' },
    { movieId: 'the_prestige_2006', date: new Date('2022-06-02'), dateISO: '2022-06-02' },
    { movieId: 'parasite_2019', date: new Date('2022-07-20'), dateISO: '2022-07-20' },
    { movieId: 'inception_2010', date: new Date('2022-08-14'), dateISO: '2022-08-14' },
    { movieId: 'the_dark_knight_2008', date: new Date('2022-09-10'), dateISO: '2022-09-10' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2022-10-05'), dateISO: '2022-10-05' },
    { movieId: 'parasite_2019', date: new Date('2022-11-12'), dateISO: '2022-11-12' },
    { movieId: 'the_prestige_2006', date: new Date('2022-11-25'), dateISO: '2022-11-25' },
    { movieId: 'inception_2010', date: new Date('2022-12-20'), dateISO: '2022-12-20' },

    // 2023 - Very active (peak watching year)
    { movieId: 'the_dark_knight_2008', date: new Date('2023-01-05'), dateISO: '2023-01-05' },
    { movieId: 'inception_2010', date: new Date('2023-01-12'), dateISO: '2023-01-12' },
    { movieId: 'parasite_2019', date: new Date('2023-01-18'), dateISO: '2023-01-18' },
    { movieId: 'the_prestige_2006', date: new Date('2023-01-28'), dateISO: '2023-01-28' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2023-02-03'), dateISO: '2023-02-03' },
    { movieId: 'the_dark_knight_2008', date: new Date('2023-02-14'), dateISO: '2023-02-14' },
    { movieId: 'inception_2010', date: new Date('2023-02-22'), dateISO: '2023-02-22' },
    { movieId: 'parasite_2019', date: new Date('2023-03-08'), dateISO: '2023-03-08' },
    { movieId: 'the_prestige_2006', date: new Date('2023-03-20'), dateISO: '2023-03-20' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2023-04-05'), dateISO: '2023-04-05' },
    { movieId: 'inception_2010', date: new Date('2023-04-18'), dateISO: '2023-04-18' },
    { movieId: 'the_dark_knight_2008', date: new Date('2023-05-10'), dateISO: '2023-05-10' },
    { movieId: 'parasite_2019', date: new Date('2023-06-02'), dateISO: '2023-06-02' },
    { movieId: 'the_prestige_2006', date: new Date('2023-06-25'), dateISO: '2023-06-25' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2023-07-12'), dateISO: '2023-07-12' },
    { movieId: 'inception_2010', date: new Date('2023-08-05'), dateISO: '2023-08-05' },
    { movieId: 'the_dark_knight_2008', date: new Date('2023-08-30'), dateISO: '2023-08-30' },
    { movieId: 'parasite_2019', date: new Date('2023-09-15'), dateISO: '2023-09-15' },
    { movieId: 'the_prestige_2006', date: new Date('2023-10-08'), dateISO: '2023-10-08' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2023-11-02'), dateISO: '2023-11-02' },
    { movieId: 'inception_2010', date: new Date('2023-11-20'), dateISO: '2023-11-20' },
    { movieId: 'the_dark_knight_2008', date: new Date('2023-12-10'), dateISO: '2023-12-10' },
    { movieId: 'parasite_2019', date: new Date('2023-12-24'), dateISO: '2023-12-24' },

    // 2024 - Continuing trend
    { movieId: 'the_prestige_2006', date: new Date('2024-01-08'), dateISO: '2024-01-08' },
    { movieId: 'everything_everywhere_all_at_once_2022', date: new Date('2024-01-22'), dateISO: '2024-01-22' },
    { movieId: 'inception_2010', date: new Date('2024-02-05'), dateISO: '2024-02-05' },
    { movieId: 'the_dark_knight_2008', date: new Date('2024-02-18'), dateISO: '2024-02-18' },
    { movieId: 'parasite_2019', date: new Date('2024-03-10'), dateISO: '2024-03-10' },
    { movieId: 'the_prestige_2006', date: new Date('2024-03-25'), dateISO: '2024-03-25' },
  ],

  // User ratings
  ratings: [
    { movieId: 'the_dark_knight_2008', rating: 5, dateRated: new Date('2022-01-15'), dateRatedISO: '2022-01-15' },
    { movieId: 'inception_2010', rating: 5, dateRated: new Date('2022-01-20'), dateRatedISO: '2022-01-20' },
    { movieId: 'the_prestige_2006', rating: 4.5, dateRated: new Date('2022-02-10'), dateRatedISO: '2022-02-10' },
    { movieId: 'parasite_2019', rating: 5, dateRated: new Date('2022-03-05'), dateRatedISO: '2022-03-05' },
    { movieId: 'everything_everywhere_all_at_once_2022', rating: 4, dateRated: new Date('2022-05-15'), dateRatedISO: '2022-05-15' },
  ],

  // User likes
  likes: [
    { movieId: 'the_dark_knight_2008', dateLiked: new Date('2022-01-15'), dateLikedISO: '2022-01-15' },
    { movieId: 'inception_2010', dateLiked: new Date('2022-01-20'), dateLikedISO: '2022-01-20' },
    { movieId: 'parasite_2019', dateLiked: new Date('2022-03-05'), dateLikedISO: '2022-03-05' },
    { movieId: 'everything_everywhere_all_at_once_2022', dateLiked: new Date('2023-02-03'), dateLikedISO: '2023-02-03' },
  ],

  // Detailed diary entries (same watch history with additional metadata)
  diaryEntries: [
    // 2020 Diary
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2020-02-10'), watchedDateISO: '2020-02-10', rating: 5, rewatch: false, tags: ['favorite', 'superhero'] },
    { movieId: 'inception_2010', watchedDate: new Date('2020-03-15'), watchedDateISO: '2020-03-15', rating: 5, rewatch: false, tags: ['mind-bending', 'sci-fi'] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2020-04-20'), watchedDateISO: '2020-04-20', rating: 4.5, rewatch: false, tags: ['thriller', 'magic'] },
    { movieId: 'parasite_2019', watchedDate: new Date('2020-05-08'), watchedDateISO: '2020-05-08', rating: 5, rewatch: false, tags: ['korean', 'thriller'] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2020-06-12'), watchedDateISO: '2020-06-12', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2020-07-18'), watchedDateISO: '2020-07-18', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2020-08-25'), watchedDateISO: '2020-08-25', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2020-09-30'), watchedDateISO: '2020-09-30', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2020-10-15'), watchedDateISO: '2020-10-15', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2020-11-20'), watchedDateISO: '2020-11-20', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2020-12-28'), watchedDateISO: '2020-12-28', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2020-12-30'), watchedDateISO: '2020-12-30', rating: 5, rewatch: true, tags: [] },

    // 2021 Diary
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2021-01-12'), watchedDateISO: '2021-01-12', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2021-02-08'), watchedDateISO: '2021-02-08', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2021-03-15'), watchedDateISO: '2021-03-15', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2021-04-02'), watchedDateISO: '2021-04-02', rating: 5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2021-05-10'), watchedDateISO: '2021-05-10', rating: 4, rewatch: false, tags: ['sci-fi', 'multiverse'] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2021-06-18'), watchedDateISO: '2021-06-18', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2021-07-22'), watchedDateISO: '2021-07-22', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2021-08-30'), watchedDateISO: '2021-08-30', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2021-09-14'), watchedDateISO: '2021-09-14', rating: 5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2021-10-25'), watchedDateISO: '2021-10-25', rating: 4, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2021-11-08'), watchedDateISO: '2021-11-08', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2021-12-20'), watchedDateISO: '2021-12-20', rating: 5, rewatch: true, tags: [] },

    // 2022 Diary
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2022-01-15'), watchedDateISO: '2022-01-15', rating: 5, rewatch: false, tags: ['favorite', 'superhero'] },
    { movieId: 'inception_2010', watchedDate: new Date('2022-01-20'), watchedDateISO: '2022-01-20', rating: 5, rewatch: false, tags: ['mind-bending', 'sci-fi'] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2022-02-10'), watchedDateISO: '2022-02-10', rating: 4.5, rewatch: true, tags: ['thriller', 'magic'] },
    { movieId: 'parasite_2019', watchedDate: new Date('2022-03-05'), watchedDateISO: '2022-03-05', rating: 5, rewatch: false, tags: ['korean', 'thriller'] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2022-03-12'), watchedDateISO: '2022-03-12', rating: 5, rewatch: true, tags: ['rewatch'] },
    { movieId: 'inception_2010', watchedDate: new Date('2022-04-08'), watchedDateISO: '2022-04-08', rating: 5, rewatch: true, tags: ['rewatch'] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2022-05-15'), watchedDateISO: '2022-05-15', rating: 4, rewatch: false, tags: ['sci-fi', 'multiverse'] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2022-06-02'), watchedDateISO: '2022-06-02', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2022-07-20'), watchedDateISO: '2022-07-20', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2022-08-14'), watchedDateISO: '2022-08-14', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2022-09-10'), watchedDateISO: '2022-09-10', rating: 5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2022-10-05'), watchedDateISO: '2022-10-05', rating: 4, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2022-11-12'), watchedDateISO: '2022-11-12', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2022-11-25'), watchedDateISO: '2022-11-25', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2022-12-20'), watchedDateISO: '2022-12-20', rating: 5, rewatch: true, tags: [] },

    // 2023 Diary (peak activity - 2+ per month)
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2023-01-05'), watchedDateISO: '2023-01-05', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2023-01-12'), watchedDateISO: '2023-01-12', rating: 5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2023-01-18'), watchedDateISO: '2023-01-18', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2023-01-28'), watchedDateISO: '2023-01-28', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2023-02-03'), watchedDateISO: '2023-02-03', rating: 4, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2023-02-14'), watchedDateISO: '2023-02-14', rating: 5, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2023-02-22'), watchedDateISO: '2023-02-22', rating: 5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2023-03-08'), watchedDateISO: '2023-03-08', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2023-03-20'), watchedDateISO: '2023-03-20', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2023-04-05'), watchedDateISO: '2023-04-05', rating: 4, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2023-04-18'), watchedDateISO: '2023-04-18', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2023-05-10'), watchedDateISO: '2023-05-10', rating: 5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2023-06-02'), watchedDateISO: '2023-06-02', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2023-06-25'), watchedDateISO: '2023-06-25', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2023-07-12'), watchedDateISO: '2023-07-12', rating: 4, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2023-08-05'), watchedDateISO: '2023-08-05', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2023-08-30'), watchedDateISO: '2023-08-30', rating: 5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2023-09-15'), watchedDateISO: '2023-09-15', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2023-10-08'), watchedDateISO: '2023-10-08', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2023-11-02'), watchedDateISO: '2023-11-02', rating: 4, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2023-11-20'), watchedDateISO: '2023-11-20', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2023-12-10'), watchedDateISO: '2023-12-10', rating: 5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2023-12-24'), watchedDateISO: '2023-12-24', rating: 5, rewatch: true, tags: [] },

    // 2024 Diary
    { movieId: 'the_prestige_2006', watchedDate: new Date('2024-01-08'), watchedDateISO: '2024-01-08', rating: 4.5, rewatch: true, tags: [] },
    { movieId: 'everything_everywhere_all_at_once_2022', watchedDate: new Date('2024-01-22'), watchedDateISO: '2024-01-22', rating: 4, rewatch: true, tags: [] },
    { movieId: 'inception_2010', watchedDate: new Date('2024-02-05'), watchedDateISO: '2024-02-05', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_dark_knight_2008', watchedDate: new Date('2024-02-18'), watchedDateISO: '2024-02-18', rating: 5, rewatch: true, tags: [] },
    { movieId: 'parasite_2019', watchedDate: new Date('2024-03-10'), watchedDateISO: '2024-03-10', rating: 5, rewatch: true, tags: [] },
    { movieId: 'the_prestige_2006', watchedDate: new Date('2024-03-25'), watchedDateISO: '2024-03-25', rating: 4.5, rewatch: true, tags: [] },
  ],

  metadata: {
    lastUpdated: new Date(),
    totalMoviesTracked: 5,
    totalWatchCount: 87,
    dateRangeStart: new Date('2020-02-10'),
    dateRangeEnd: new Date('2024-03-25'),
  },
};
