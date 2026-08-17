const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  // tsconfig.json khai báo paths "@/*" nhưng KHÔNG có baseUrl, nên next/jest không tự suy
  // ra được alias và mọi import '@/...' trong test đều báo "Cannot find module".
  // Khai báo thẳng ở đây thay vì sửa tsconfig để không đụng tới cấu hình build.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
