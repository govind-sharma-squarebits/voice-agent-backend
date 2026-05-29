import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { dbLogger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_DIR = join(__dirname, '../../knowledge');

const FILES = ['company.md', 'services.md', 'faq.md', 'pricing.md'];

let cachedContext: string | null = null;

export async function loadKnowledgeBase(): Promise<string> {
  if (cachedContext) return cachedContext;

  const sections: string[] = [];

  for (const file of FILES) {
    try {
      const filePath = join(KNOWLEDGE_DIR, file);
      const content = await readFile(filePath, 'utf-8');
      sections.push(content.trim());
      dbLogger.debug({ file }, 'Knowledge file loaded');
    } catch (error) {
      dbLogger.warn({ file, error: String(error) }, 'Could not load knowledge file');
    }
  }

  cachedContext = sections.join('\n\n---\n\n');
  dbLogger.info({ files: FILES.length, bytes: cachedContext.length }, 'Knowledge base loaded and cached');
  return cachedContext;
}

export function getKnowledgeContext(): string {
  if (!cachedContext) {
    throw new Error('Knowledge base not loaded. Call loadKnowledgeBase() first.');
  }
  return cachedContext;
}

export function invalidateKnowledgeCache(): void {
  cachedContext = null;
}
