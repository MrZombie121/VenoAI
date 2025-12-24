import fs from 'node:fs';
import path from 'node:path';

type Lang = 'ru' | 'en' | 'any';

type MarkovModel = {
  order: 2;
  lang: Lang;
  transitions: Record<string, string[]>;
  starters: string[];
};

const args = process.argv.slice(2);
const inputPath = getArgValue('--input', args);
const outputPath = getArgValue('--output', args) || path.join(process.cwd(), 'markov.model.json');
const knowledgePath = getArgValue('--knowledge', args) || path.join(process.cwd(), 'knowledge.corpus.json');
const langArg = (getArgValue('--lang', args) as Lang) || 'any';

if (!inputPath) {
  console.error(
    'Usage: tsx scripts/train_markov.ts --input data.txt [--output markov.model.json] [--knowledge knowledge.corpus.json] [--lang ru|en|any]'
  );
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf-8');
const sentences = splitSentences(raw);
const transitions: Record<string, string[]> = {};
const starters: string[] = [];
const knowledgeSentences = new Set<string>();

for (const sentence of sentences) {
  const tokens = tokenize(sentence);
  if (tokens.length < 3) continue;
  knowledgeSentences.add(sentence.trim());
  starters.push(tokens[0] + '|' + tokens[1]);
  for (let i = 0; i < tokens.length - 2; i++) {
    const key = tokens[i] + '|' + tokens[i + 1];
    const next = tokens[i + 2];
    if (!transitions[key]) transitions[key] = [];
    transitions[key].push(next);
  }
}

const model: MarkovModel = {
  order: 2,
  lang: langArg,
  transitions,
  starters
};

fs.writeFileSync(outputPath, JSON.stringify(model, null, 2), 'utf-8');
console.log(`Saved model to ${outputPath}`);

const knowledge = {
  lang: langArg,
  sentences: Array.from(knowledgeSentences).slice(0, 2000)
};

fs.writeFileSync(knowledgePath, JSON.stringify(knowledge, null, 2), 'utf-8');
console.log(`Saved knowledge to ${knowledgePath}`);

function getArgValue(name: string, list: string[]): string | undefined {
  const idx = list.indexOf(name);
  if (idx === -1) return undefined;
  return list[idx + 1];
}

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (matches && matches.length > 0) {
    return matches.map((s) => s.trim());
  }
  return [text.trim()];
}

function tokenize(text: string): string[] {
  const tokens = text.match(/[A-Za-z\u0400-\u04FF0-9']+|[.,!?;:()]/g);
  return tokens ? tokens : [];
}
