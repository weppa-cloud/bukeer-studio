/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/ct/',
    '<rootDir>/__tests__/visual/',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@bukeer/website-contract$':
      '<rootDir>/packages/website-contract/src/index',
    '^@bukeer/admin-contract$':
      '<rootDir>/packages/admin-contract/src/index',
    '^@bukeer/theme-sdk$': '<rootDir>/packages/theme-sdk/src/index',
  },
  transform: {
    // `tsconfig.jest.json` overrides `jsx: preserve` → `react-jsx` so
    // component tests can render JSX directly under ts-jest.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
};
