/** Jest config: unit tests use node; legacy puppeteer suites stay opt-in. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/navHelpers.test.ts'],
  moduleNameMapper: {
    '^plugin/(.*)$': '<rootDir>/src/plugin/$1',
    '^typings$': '<rootDir>/src/typings.ts',
  },
};
