import fg from 'fast-glob';
import path from 'path';

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/target/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.taskmaster/**',
];

export async function walkFiles(root: string): Promise<string[]> {
  const patterns = [
    '**/*.rs',
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
  ];
  const entries = await fg(patterns, {
    cwd: root,
    absolute: true,
    ignore: DEFAULT_IGNORE,
    followSymbolicLinks: true,
  });
  return entries.map((e) => path.normalize(e));
}
