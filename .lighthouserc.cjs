module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173/login', 'http://localhost:5173/unauthorized'],
      // vite preview defaults to 4173 — pin it to the URL above.
      startServerCommand: 'pnpm preview --port 5173 --strictPort',
      startServerReadyPattern: 'Local',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
