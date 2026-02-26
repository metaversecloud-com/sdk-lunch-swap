import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/"],
  testMatch: ["**/tests/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  clearMocks: true,
  restoreMocks: true,

  moduleNameMapper: {
    // 🔒 Force all imports of the SDK to our mock file
    "^@rtsdk/topia$": "<rootDir>/mocks/@rtsdk/topia.ts",
    "^@rtsdk/topia/(.*)$": "<rootDir>/mocks/@rtsdk/topia.ts",

    // ✅ Only strip `.js` from *relative* imports, so your runtime-friendly
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};

export default config;
