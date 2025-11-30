import path from 'path';
import { promises as fs } from 'fs';
import { getTsPaths, mapWithPaths } from './tsconfig';

const CANDIDATE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

async function fileExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

export async function findAppSrcRoot(fromFile: string): Promise<string | null> {
  let dir = path.dirname(fromFile);
  for (let i = 0; i < 10; i++) {
    const candidate = path.join(dir, 'src');
    if (await dirExists(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function resolveAsFile(base: string): Promise<string | null> {
  // exact
  if (await fileExists(base)) return base;
  // with extensions
  for (const ext of CANDIDATE_EXT) {
    if (await fileExists(base + ext)) return base + ext;
  }
  return null;
}

async function resolveAsDir(base: string): Promise<string | null> {
  if (!(await dirExists(base))) return null;
  // index files
  for (const ext of CANDIDATE_EXT) {
    const p = path.join(base, 'index' + ext);
    if (await fileExists(p)) return p;
  }
  return null;
}

export async function resolveImport(fromFile: string, spec: string, projectRoot: string): Promise<string | null> {
  try {
    if (spec.startsWith('http://') || spec.startsWith('https://')) return null;
    // relative import
    if (spec.startsWith('./') || spec.startsWith('../')) {
      const abs = path.resolve(path.dirname(fromFile), spec);
      return (await resolveAsFile(abs)) || (await resolveAsDir(abs));
    }

    // absolute-from-root import ('/foo') seen in some bundlers
    if (spec.startsWith('/')) {
      const abs = path.join(projectRoot, spec); // treat as repo-root based
      return (await resolveAsFile(abs)) || (await resolveAsDir(abs));
    }

    // Resolve via tsconfig paths if available
    const tsPaths = await getTsPaths(fromFile);
    if (tsPaths) {
      const candidates = mapWithPaths(spec, tsPaths);
      for (const cand of candidates) {
        const r = (await resolveAsFile(cand)) || (await resolveAsDir(cand));
        if (r) return r;
      }
    }

    // Fallback: common '@' alias → nearest src
    if (spec.startsWith('@/')) {
      const srcRoot = (await findAppSrcRoot(fromFile)) || path.join(projectRoot, 'apps', 'dashboard', 'src');
      const rel = spec.slice(2);
      const abs = path.join(srcRoot, rel);
      return (await resolveAsFile(abs)) || (await resolveAsDir(abs));
    }

    // Bare module (react, lodash, etc.) → external, skip
    return null;
  } catch {
    return null;
  }
}
