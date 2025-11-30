import path from 'path';
import { promises as fs } from 'fs';

export interface TsPaths {
  baseUrl: string | null;
  paths: Record<string, string[]>; // key patterns to target patterns
}

function stripJsonComments(input: string): string {
  // Remove // ... and /* ... */ comments
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

async function readJsonc(file: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const clean = stripJsonComments(raw);
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

export async function findNearestTsConfig(fromFile: string): Promise<string | null> {
  let dir = path.dirname(fromFile);
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (await fileExists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export async function getTsPaths(fromFile: string): Promise<TsPaths | null> {
  const cfgPath = await findNearestTsConfig(fromFile);
  if (!cfgPath) return null;
  const json = await readJsonc(cfgPath);
  if (!json || !json.compilerOptions) return null;
  const baseUrl: string | null = json.compilerOptions.baseUrl
    ? path.resolve(path.dirname(cfgPath), json.compilerOptions.baseUrl)
    : null;
  const paths: Record<string, string[]> = json.compilerOptions.paths || {};
  // Normalize target paths to absolute
  const absPaths: Record<string, string[]> = {};
  for (const [key, arr] of Object.entries(paths)) {
    absPaths[key] = (arr || []).map((p: string) =>
      path.resolve(path.dirname(cfgPath), baseUrl ? path.join(baseUrl, p) : p)
    );
  }
  return { baseUrl, paths: absPaths };
}

export function mapWithPaths(spec: string, mapping: TsPaths): string[] {
  const out: string[] = [];
  for (const [pattern, targets] of Object.entries(mapping.paths)) {
    const starIndex = pattern.indexOf('*');
    if (starIndex >= 0) {
      const prefix = pattern.slice(0, starIndex);
      const suffix = pattern.slice(starIndex + 1);
      if (spec.startsWith(prefix) && spec.endsWith(suffix)) {
        const middle = spec.slice(prefix.length, spec.length - suffix.length);
        for (const t of targets) {
          const tStar = t.indexOf('*');
          if (tStar >= 0) out.push(t.replace('*', middle));
          else out.push(t);
        }
      }
    } else if (pattern === spec) {
      out.push(...targets);
    }
  }
  return out;
}
