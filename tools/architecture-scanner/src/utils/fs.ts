import { promises as fs } from 'fs';

export async function readText(file: string): Promise<string> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

export async function statSafe(file: string) {
  try {
    return await fs.stat(file);
  } catch {
    return undefined;
  }
}

export async function writeText(file: string, content: string) {
  await fs.writeFile(file, content, 'utf8');
}
