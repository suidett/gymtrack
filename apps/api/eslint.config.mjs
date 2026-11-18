// ─────────────────────────────────────────────────────────────────────────────
// ESLint de la API · Zona: Configuración (API)
//
// Qué hace: lint de TypeScript para apps/api con las reglas recomendadas de typescript-eslint.
// Además prohíbe las consultas de Prisma armadas con texto ($queryRawUnsafe, $executeRawUnsafe):
// §Seguridad pide consultas solo por Prisma, sin SQL armado a mano (SEG-013).
// Tócalo cuando: quieras agregar o apagar una regla.
// No lo toques para: el lint de la app (apps/mobile/eslint.config.js).
// Depende de: eslint y typescript-eslint.
// ─────────────────────────────────────────────────────────────────────────────
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'src/generado/**', 'node_modules/**', 'coverage/**'] },
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-restricted-properties': [
        'error',
        { property: '$queryRawUnsafe', message: 'Usa $queryRaw con plantilla: nada de SQL armado con texto (SEG-013).' },
        { property: '$executeRawUnsafe', message: 'Usa $executeRaw con plantilla: nada de SQL armado con texto (SEG-013).' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
