module.exports = {
  testMatch: ['<rootDir>/apps/api/**/*.spec.ts'],
  transform: {
    // root 無 tsconfig, ts-jest 走預設編譯選項,
    // 只補兩個 decorator 選項(experimentalDecorators/emitDecoratorMetadata),
    // 保持既有 spec 的編譯嚴格度不變;
    // 新 controller spec 的參數裝飾器在無此 flag 時會 TS1206。
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: { experimentalDecorators: true, emitDecoratorMetadata: true } },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'node',
  verbose: true,
};
