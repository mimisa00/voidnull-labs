module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  transform: { '^.+\.(t|j)sx?$': 'ts-jest' },
  testMatch: ['**/test/**/*.spec.ts'],
};