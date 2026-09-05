import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts', 'server/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/services/obligationEngine.ts',
        'src/services/payrollTaxEngine.ts',
        'src/services/complianceScoreEngine.ts',
        'server/fallback/normalize.ts',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 55,
      },
    },
  },
});
