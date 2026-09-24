const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/lib/payroll.ts',
    'src/lib/auth.ts',
    'src/lib/auth-server.ts',
    'src/lib/session.ts',
    'src/lib/app-data-validation.ts',
    'src/lib/backup.ts',
    'src/lib/class-generation.ts',
    'src/lib/coefficient-copy.ts',
    'src/lib/numeric-input.ts',
    'src/lib/report-export.ts',
    'src/lib/state-version.ts',
    'src/lib/repository.ts',
    'src/lib/use-app-data.ts',
    'src/lib/use-auth.tsx'
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      functions: 95,
      lines: 95
    }
  }
};

module.exports = createJestConfig(customJestConfig);
