module.exports = {
  testMatch: ['<rootDir>/apps/api/**/*.spec.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'node',
  verbose: true,
};
