const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/lib/types.ts'
  ],
  coverageReporters: ['text-summary', 'json-summary', 'lcov', 'html'],
  coverageThreshold: {
    // Keep the original core gate and measure API/UI independently so highly
    // covered calculation helpers cannot hide missing feature tests.
    './src/lib/': {
      statements: 90,
      branches: 85,
      functions: 95,
      lines: 95
    },
    './src/app/api/': {
      statements: 90,
      branches: 80,
      functions: 95,
      lines: 95
    },
    './src/components/': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 85
    }
  }
};

module.exports = createJestConfig(customJestConfig);
