/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@bukeer/website-contract$':
      '<rootDir>/packages/website-contract/src/index',
  },
  transform: {
    // `tsconfig.jest.json` overrides `jsx: preserve` → `react-jsx` so
    // component tests can render JSX directly under ts-jest.
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
};
