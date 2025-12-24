import fs from 'node:fs';
import path from 'node:path';

type Lang = 'ru' | 'en';

type Lexicon = {
  verbs: string[];
  nouns: string[];
  adjs?: string[];
  advs?: string[];
  objects: string[];
  preps: string[];
  closers: string[];
};

type MarkovModel = {
  order: number;
  lang: Lang | 'any';
  transitions: Record<string, string[]>;
  starters: string[];
};

type Knowledge = {
  lang: Lang | 'any';
  sentences: string[];
};

const lexicon: Record<Lang, Lexicon> = {
  en: {
    verbs: ['build', 'explain', 'analyze', 'design', 'debug', 'summarize'],
    nouns: ['solution', 'answer', 'plan', 'snippet', 'approach'],
    adjs: ['clear', 'practical', 'safe', 'concise', 'robust', 'useful'],
    objects: ['your request', 'the task', 'the issue', 'the requirements', 'the context'],
    preps: ['for', 'around', 'based on', 'within'],
    closers: [
      'Share constraints and I will refine it.',
      'If you want, I can expand or add examples.',
      'Tell me the goal and I will adjust the output.'
    ]
  },
  ru: {
    verbs: ['\u043f\u0440\u0435\u0434\u043b\u0430\u0433\u0430\u044e', '\u043e\u0431\u044a\u044f\u0441\u043d\u044f\u044e', '\u0440\u0430\u0437\u0431\u0438\u0440\u0430\u044e', '\u0444\u043e\u0440\u043c\u0443\u043b\u0438\u0440\u0443\u044e', '\u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u044e', '\u043f\u043e\u043c\u043e\u0433\u0430\u044e'],
    nouns: ['\u0440\u0435\u0448\u0435\u043d\u0438\u0435', '\u043e\u0442\u0432\u0435\u0442', '\u043f\u043b\u0430\u043d', '\u043f\u0440\u0438\u043c\u0435\u0440', '\u043f\u043e\u0434\u0445\u043e\u0434'],
    advs: ['\u0447\u0435\u0442\u043a\u043e', '\u043a\u0440\u0430\u0442\u043a\u043e', '\u043d\u0430\u0434\u0435\u0436\u043d\u043e', '\u043f\u043e\u043d\u044f\u0442\u043d\u043e', '\u043f\u0440\u0430\u043a\u0442\u0438\u0447\u043d\u043e', '\u043f\u043e \u0434\u0435\u043b\u0443'],
    objects: ['\u0432\u0430\u0448 \u0437\u0430\u043f\u0440\u043e\u0441', '\u0437\u0430\u0434\u0430\u0447\u0443', '\u043f\u0440\u043e\u0431\u043b\u0435\u043c\u0443', '\u0442\u0440\u0435\u0431\u043e\u0432\u0430\u043d\u0438\u044f', '\u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442'],
    preps: ['\u0434\u043b\u044f', '\u043f\u043e', '\u043d\u0430 \u043e\u0441\u043d\u043e\u0432\u0435', '\u0432 \u0440\u0430\u043c\u043a\u0430\u0445'],
    closers: [
      '\u0421\u043a\u0430\u0436\u0438 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f, \u0438 \u044f \u0443\u0442\u043e\u0447\u043d\u044e \u043e\u0442\u0432\u0435\u0442.',
      '\u0415\u0441\u043b\u0438 \u043d\u0443\u0436\u043d\u043e, \u0434\u043e\u0431\u0430\u0432\u043b\u044e \u043f\u0440\u0438\u043c\u0435\u0440\u044b \u0438 \u0434\u0435\u0442\u0430\u043b\u0438.',
      '\u041e\u043f\u0438\u0448\u0438 \u0446\u0435\u043b\u044c, \u0438 \u044f \u043f\u043e\u0434\u0441\u0442\u0440\u043e\u044e \u0440\u0435\u0448\u0435\u043d\u0438\u0435.'
    ]
  }
};

const fallbackReplies: Record<Lang, string[]> = {
  en: [
    'Share the goal, constraints, and desired format, and I will tailor the answer.',
    'I can deliver a plan, explanation, or code. Tell me what result you want.',
    'Give a bit more context and I will respond with specifics.'
  ],
  ru: [
    '\u041e\u043f\u0438\u0448\u0438 \u0446\u0435\u043b\u044c, \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f \u0438 \u043d\u0443\u0436\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 \u043e\u0442\u0432\u0435\u0442\u0430.',
    '\u041c\u043e\u0433\u0443 \u0434\u0430\u0442\u044c \u043f\u043b\u0430\u043d, \u043e\u0431\u044a\u044f\u0441\u043d\u0435\u043d\u0438\u0435 \u0438\u043b\u0438 \u043a\u043e\u0434. \u0421\u043a\u0430\u0436\u0438, \u043a\u0430\u043a\u043e\u0439 \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u043d\u0443\u0436\u0435\u043d.',
    '\u0414\u0430\u0439 \u043d\u0435\u043c\u043d\u043e\u0433\u043e \u043a\u043e\u043d\u0442\u0435\u043a\u0441\u0442\u0430, \u0438 \u044f \u043e\u0442\u0432\u0435\u0447\u0443 \u0442\u043e\u0447\u043d\u043e \u0438 \u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u043d\u043e.'
  ]
};

const MODEL_PATH = process.env.AI_MODEL_PATH || path.join(process.cwd(), 'markov.model.json');
const KNOWLEDGE_PATH = process.env.AI_KNOWLEDGE_PATH || path.join(process.cwd(), 'knowledge.corpus.json');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1-8b';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 60000);
const OLLAMA_DEBUG = process.env.OLLAMA_DEBUG === '1';
let cachedModel: MarkovModel | null = null;
let cachedKnowledge: Knowledge | null = null;

export async function generateReply(prompt: string, modelOverride?: string): Promise<string> {
  const lang = detectLanguage(prompt);
  const lower = prompt.toLowerCase();
  if (isCreatorQuestion(lower)) {
    return lang === 'ru'
      ? '\u041c\u0435\u043d\u044f \u0441\u043e\u0437\u0434\u0430\u043b\u0430 \u043a\u043e\u043c\u0430\u043d\u0434\u0430 OpVenTech.'
      : 'I was created by the OpVenTech team.';
  }
  const wantsCode = hasAny(lower, [
    'code',
    'snippet',
    'example',
    'function',
    'bug',
    'error',
    '\u043a\u043e\u0434',
    '\u043f\u0440\u0438\u043c\u0435\u0440',
    '\u0444\u0443\u043d\u043a\u0446\u0438\u044f',
    '\u043e\u0448\u0438\u0431\u043a\u0430'
  ]);

  const modelMode = normalizeModel(modelOverride);
  if (modelMode !== 'markov') {
    const ollamaReply = await tryOllama(prompt, lang, modelOverride);
    if (ollamaReply) {
      return ollamaReply;
    }
  }

  if (wantsCode) {
    const codeLang = detectCodeLang(lower);
    return buildCodeReply(lang, codeLang);
  }

  const model = loadModel();
  const markov = model ? generateMarkov(model, lang, 42) : '';
  if (markov && markov.split(' ').length >= 5) {
    return markov + ' ' + pick(lexicon[lang].closers);
  }

  const knowledge = loadKnowledge();
  const knowledgeHit = knowledge ? selectKnowledgeSentence(knowledge, prompt, lang) : '';
  if (knowledgeHit) {
    return knowledgeHit + ' ' + pick(lexicon[lang].closers);
  }

  return buildTextReply(prompt, lang);
}

function buildTextReply(prompt: string, lang: Lang): string {
  const lower = prompt.toLowerCase();
  if (isPlannerPrompt(lower)) {
    return buildPlannerReply(prompt, lang);
  }
  if (isExplainPrompt(lower)) {
    return buildExplainReply(prompt, lang);
  }
  if (isIdeaPrompt(lower)) {
    return buildIdeaReply(prompt, lang);
  }
  if (isHowToPrompt(lower)) {
    return buildHowToReply(prompt, lang);
  }
  return seededPick(prompt, fallbackReplies[lang]);
}

function buildCodeReply(lang: Lang, codeLang: 'python' | 'csharp'): string {
  const intro = lang === 'ru'
    ? '\u0412\u043e\u0442 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u0430\u044f \u0437\u0430\u0433\u043e\u0442\u043e\u0432\u043a\u0430 \u043a\u043e\u0434\u0430:'
    : 'Here is a minimal code starter:';
  const outro = lang === 'ru'
    ? '\u0415\u0441\u043b\u0438 \u043d\u0443\u0436\u043d\u0430 \u043a\u043e\u043d\u043a\u0440\u0435\u0442\u0438\u043a\u0430 \u043f\u043e \u0437\u0430\u0434\u0430\u0447\u0435, \u0441\u043a\u0430\u0436\u0438 \u0443\u0441\u043b\u043e\u0432\u0438\u044f.'
    : 'If you share requirements, I can tailor it.';
  return [intro, buildCodeBlock(codeLang), outro].join('\n\n');
}

function detectLanguage(text: string): Lang {
  return /[\u0430-\u044f\u0451]/i.test(text) ? 'ru' : 'en';
}

function hasAny(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token));
}

function detectCodeLang(text: string): 'python' | 'csharp' {
  if (hasAny(text, ['c#', 'csharp', '\u0448\u0430\u0440\u043f', '\u0441\u0438 \u0448\u0430\u0440\u043f'])) return 'csharp';
  return 'python';
}

function isPlannerPrompt(text: string): boolean {
  return hasAny(text, [
    'plan',
    'schedule',
    'routine',
    '\u043f\u043b\u0430\u043d',
    '\u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435',
    '\u043d\u0435\u0434\u0435\u043b\u044e',
    '\u0434\u0435\u043d\u044c',
    '\u0433\u0440\u0430\u0444\u0438\u043a'
  ]);
}

function isExplainPrompt(text: string): boolean {
  return hasAny(text, [
    'explain',
    'what is',
    'meaning',
    '\u043e\u0431\u044a\u044f\u0441\u043d\u0438',
    '\u0447\u0442\u043e \u0442\u0430\u043a\u043e\u0435',
    '\u043f\u043e\u044f\u0441\u043d\u0438',
    '\u0441\u043c\u044b\u0441\u043b'
  ]);
}

function isIdeaPrompt(text: string): boolean {
  return hasAny(text, [
    'idea',
    'ideas',
    'brainstorm',
    '\u0438\u0434\u0435\u044f',
    '\u0438\u0434\u0435\u0438',
    '\u043f\u0440\u0438\u0434\u0443\u043c\u0430\u0439',
    '\u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0438'
  ]);
}

function isHowToPrompt(text: string): boolean {
  return hasAny(text, [
    'how to',
    'steps',
    'guide',
    '\u043a\u0430\u043a',
    '\u0438\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044f',
    '\u0448\u0430\u0433\u0438',
    '\u043f\u043e\u0448\u0430\u0433\u043e\u0432\u043e'
  ]);
}

function isCreatorQuestion(text: string): boolean {
  return hasAny(text, [
    'who created you',
    'who made you',
    'who built you',
    'who are you made by',
    '\u043a\u0442\u043e \u0442\u0435\u0431\u044f \u0441\u043e\u0437\u0434\u0430\u043b',
    '\u043a\u0442\u043e \u0442\u0435\u0431\u044f \u0441\u0434\u0435\u043b\u0430\u043b',
    '\u043a\u0442\u043e \u0441\u0434\u0435\u043b\u0430\u043b \u0442\u0435\u0431\u044f',
    '\u043a\u0435\u043c \u0442\u044b \u0441\u043e\u0437\u0434\u0430\u043d'
  ]);
}

function buildCodeBlock(lang: 'python' | 'csharp'): string {
  if (lang === 'csharp') {
    return [
      'using System;',
      'using System.Net.Http;',
      'using System.Threading.Tasks;',
      '',
      'class Program',
      '{',
      '    static async Task Main()',
      '    {',
      '        using var http = new HttpClient();',
      '        var res = await http.GetAsync(\"https://example.com/api\");',
      '        var body = await res.Content.ReadAsStringAsync();',
      '        Console.WriteLine(body);',
      '    }',
      '}',
    ].join('\n');
  }

  return [
    'import requests',
    '',
    'def fetch_json(url: str) -> dict:',
    '    res = requests.get(url, timeout=10)',
    '    res.raise_for_status()',
    '    return res.json()',
    '',
    'print(fetch_json(\"https://example.com/api\"))',
  ].join('\n');
}

function buildPlannerReply(prompt: string, lang: Lang): string {
  const times = extractTimes(prompt);
  if (lang === 'ru') {
    if (times.length >= 2) {
      const wake = times[0];
      const sleep = times[times.length - 1];
      return [
        `\u0412\u043e\u0442 \u043f\u0440\u043e\u0441\u0442\u043e\u0439 \u0434\u043d\u0435\u0432\u043d\u043e\u0439 \u043f\u043b\u0430\u043d \u043e\u0442 ${wake} \u0434\u043e ${sleep}:`,
        `- ${wake} \u2013 \u043f\u043e\u0434\u044a\u0435\u043c, \u0432\u043e\u0434\u0430, \u043b\u0435\u0433\u043a\u0430\u044f \u0440\u0430\u0437\u043c\u0438\u043d\u043a\u0430.`,
        '- 08:00 \u2013 \u0433\u043b\u0430\u0432\u043d\u0430\u044f \u0437\u0430\u0434\u0430\u0447\u0430 \u0434\u043d\u044f (1 \u0431\u043b\u043e\u043a).',
        '- 10:30 \u2013 \u043f\u0435\u0440\u0435\u0440\u044b\u0432 10\u201315 \u043c\u0438\u043d.',
        '- 10:45 \u2013 \u0432\u0442\u043e\u0440\u043e\u0439 \u0431\u043b\u043e\u043a (2 \u0447\u0430\u0441\u0430).',
        '- 13:00 \u2013 \u043e\u0431\u0435\u0434 + \u043f\u0440\u043e\u0433\u0443\u043b\u043a\u0430.',
        '- 14:30 \u2013 \u043b\u0435\u0433\u043a\u0438\u0435 \u0437\u0430\u0434\u0430\u0447\u0438 / \u0440\u0443\u0442\u0438\u043d\u0430.',
        '- 18:00 \u2013 \u0441\u043f\u043e\u0440\u0442 / \u043e\u0442\u0434\u044b\u0445.',
        `- 21:30 \u2013 \u0440\u0430\u0437\u0433\u0440\u0443\u0437\u043a\u0430, \u0431\u0435\u0437 \u044d\u043a\u0440\u0430\u043d\u043e\u0432.`,
        `- ${sleep} \u2013 \u0441\u043e\u043d.`,
        '\u0415\u0441\u043b\u0438 \u043d\u0443\u0436\u0435\u043d \u043d\u0435\u0434\u0435\u043b\u044c\u043d\u044b\u0439 \u043f\u043b\u0430\u043d \u2014 \u0441\u043a\u0430\u0436\u0438 \u0446\u0435\u043b\u0438 \u0438 \u0437\u0430\u043d\u044f\u0442\u043e\u0441\u0442\u044c.'
      ].join('\n');
    }
    return [
      '\u041f\u0440\u043e\u0441\u0442\u043e\u0439 \u043f\u043b\u0430\u043d \u043d\u0430 \u043d\u0435\u0434\u0435\u043b\u044e:',
      '- \u041f\u043d: \u0433\u043b\u0430\u0432\u043d\u0430\u044f \u0446\u0435\u043b\u044c + 1\u20132 \u043a\u043b\u044e\u0447\u0435\u0432\u044b\u0435 \u0437\u0430\u0434\u0430\u0447\u0438.',
      '- \u0412\u0442: \u043f\u0440\u043e\u0434\u0432\u0438\u0436\u0435\u043d\u0438\u0435 \u043f\u043e \u043f\u0440\u043e\u0435\u043a\u0442\u0443, \u0440\u0443\u0442\u0438\u043d\u0430.',
      '- \u0421\u0440: \u0433\u043b\u0443\u0431\u043e\u043a\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430 (2 \u0431\u043b\u043e\u043a\u0430).',
      '- \u0427\u0442: \u0434\u043e\u0432\u0435\u0441\u0442\u0438 \u043d\u0430\u0447\u0430\u0442\u043e\u0435, \u043c\u0435\u043b\u043e\u0447\u0438.',
      '- \u041f\u0442: \u0438\u0442\u043e\u0433\u0438 \u043d\u0435\u0434\u0435\u043b\u0438, \u043f\u043b\u0430\u043d \u043d\u0430 \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0443\u044e.',
      '\u0421\u043a\u0430\u0436\u0438 \u0446\u0435\u043b\u044c \u0438 \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0432\u0440\u0435\u043c\u0435\u043d\u0438 \u0432 \u0434\u0435\u043d\u044c \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e.'
    ].join('\n');
  }

  return [
    'Here is a simple weekly plan:',
    '- Mon: define the main goal and 1-2 key tasks.',
    '- Tue: progress on the core tasks.',
    '- Wed: deep work block (2 focus sessions).',
    '- Thu: finish open items and admin tasks.',
    '- Fri: review and plan next week.',
    'Tell me your available hours and priorities to customize it.'
  ].join('\n');
}

function buildExplainReply(prompt: string, lang: Lang): string {
  const topic = extractTopic(prompt, lang);
  if (lang === 'ru') {
    return [
      `\u041a\u0440\u0430\u0442\u043a\u043e \u043e \u0442\u0435\u043c\u0435: ${topic || '\u044d\u0442\u043e'}.`,
      '\u041e\u043f\u0440\u0435\u0434\u0435\u043b\u0435\u043d\u0438\u0435: \u0447\u0442\u043e \u044d\u0442\u043e \u0442\u0430\u043a\u043e\u0435 \u0438 \u0437\u0430\u0447\u0435\u043c \u043d\u0443\u0436\u043d\u043e.',
      '\u041a\u043b\u044e\u0447\u0435\u0432\u044b\u0435 \u0438\u0434\u0435\u0438: 3\u20134 \u043f\u0443\u043d\u043a\u0442\u0430 \u043f\u043e \u0441\u0443\u0442\u0438.',
      '\u041f\u0440\u0438\u043c\u0435\u0440: \u043a\u043e\u0440\u043e\u0442\u043a\u0438\u0439 \u043a\u0435\u0439\u0441 \u0438\u0437 \u0436\u0438\u0437\u043d\u0438.',
      '\u0425\u043e\u0447\u0435\u0448\u044c \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435 \u0438\u043b\u0438 \u0441 \u043f\u0440\u0438\u043c\u0435\u0440\u043e\u043c \u043a\u043e\u0434\u0430?'
    ].join('\n');
  }
  return [
    `Quick explanation of ${topic || 'the topic'}:`,
    'Definition: what it is and why it matters.',
    'Key points: 3-4 essential ideas.',
    'Example: a short real-world case.',
    'Want a deeper dive or a code example?'
  ].join('\n');
}

function buildIdeaReply(prompt: string, lang: Lang): string {
  const topic = extractTopic(prompt, lang);
  const base = lang === 'ru'
    ? `\u0412\u043e\u0442 5 \u0438\u0434\u0435\u0439 \u043f\u043e \u0442\u0435\u043c\u0435: ${topic || '\u0442\u0432\u043e\u0439 \u0437\u0430\u043f\u0440\u043e\u0441'}`
    : `Here are 5 ideas for: ${topic || 'your request'}`;
  const items = lang === 'ru'
    ? [
        '\u041b\u0435\u0433\u043a\u0438\u0439 MVP \u0441 \u043e\u0434\u043d\u043e\u0439 \u0433\u043b\u0430\u0432\u043d\u043e\u0439 \u0444\u0443\u043d\u043a\u0446\u0438\u0435\u0439.',
        '\u0410\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044f \u0440\u0443\u0442\u0438\u043d\u044b \u0447\u0435\u0440\u0435\u0437 \u0448\u0430\u0431\u043b\u043e\u043d\u044b \u0438 \u043f\u0440\u0435\u0441\u0435\u0442\u044b.',
        '\u0424\u043e\u043a\u0443\u0441 \u043d\u0430 \u043e\u0434\u043d\u0443 \u0430\u0443\u0434\u0438\u0442\u043e\u0440\u0438\u044e \u0438 \u0431\u043e\u043b\u044c.',
        '\u0427\u0435\u043a\u043b\u0438\u0441\u0442 + \u043e\u0442\u0447\u0435\u0442 \u0432 \u043e\u0434\u0438\u043d \u043a\u043b\u0438\u043a.',
        '\u0418\u0433\u0440\u043e\u0432\u043e\u0439 \u043c\u0435\u0445\u0430\u043d\u0438\u0437\u043c \u0434\u043b\u044f \u0432\u043e\u0432\u043b\u0435\u0447\u0435\u043d\u0438\u044f.'
      ]
    : [
        'A lightweight MVP with one core feature.',
        'Automate the routine with templates and presets.',
        'Focus on a single audience and pain point.',
        'Checklist + one-click report.',
        'Gamified flow to boost engagement.'
      ];
  return [base, ...items.map((item, i) => `${i + 1}. ${item}`)].join('\n');
}

function buildHowToReply(prompt: string, lang: Lang): string {
  const topic = extractTopic(prompt, lang);
  if (lang === 'ru') {
    return [
      `\u041f\u043e\u0448\u0430\u0433\u043e\u0432\u043e \u043f\u043e \u0442\u0435\u043c\u0435: ${topic || '\u0437\u0430\u0434\u0430\u0447\u0430'}`,
      '1. \u041e\u043f\u0440\u0435\u0434\u0435\u043b\u0438 \u0446\u0435\u043b\u044c \u0438 \u043a\u0440\u0438\u0442\u0435\u0440\u0438\u0438 \u0443\u0441\u043f\u0435\u0445\u0430.',
      '2. \u0420\u0430\u0437\u0431\u0435\u0439 \u0437\u0430\u0434\u0430\u0447\u0443 \u043d\u0430 3\u20135 \u0448\u0430\u0433\u043e\u0432.',
      '3. \u041e\u0442\u043c\u0435\u0442\u044c \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f \u0438 \u0440\u0438\u0441\u043a\u0438.',
      '4. \u0421\u0434\u0435\u043b\u0430\u0439 \u043c\u0438\u043d\u0438\u043c\u0430\u043b\u044c\u043d\u044b\u0439 \u0432\u0430\u0440\u0438\u0430\u043d\u0442 \u0438 \u043f\u0440\u043e\u0432\u0435\u0440\u044c.',
      '5. \u0414\u043e\u0432\u0435\u0434\u0438 \u0434\u043e \u0440\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442\u0430 \u0438 \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u0443\u0439 \u0448\u0430\u0431\u043b\u043e\u043d.',
      '\u0421\u043a\u0430\u0436\u0438 \u043e\u0433\u0440\u0430\u043d\u0438\u0447\u0435\u043d\u0438\u044f, \u0438 \u044f \u0430\u0434\u0430\u043f\u0442\u0438\u0440\u0443\u044e \u0448\u0430\u0433\u0438.'
    ].join('\n');
  }
  return [
    `Step-by-step for: ${topic || 'your task'}`,
    '1. Define the goal and success criteria.',
    '2. Break it into 3-5 steps.',
    '3. Note constraints and risks.',
    '4. Build a minimal version and validate.',
    '5. Iterate and document a repeatable flow.',
    'Share constraints and I will tailor the steps.'
  ].join('\n');
}

function extractTimes(text: string): string[] {
  const matches = text.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/g);
  return matches ? matches : [];
}

function extractTopic(text: string, lang: Lang): string {
  const tokens = tokenizeWords(text).filter((t) => t.length > 2);
  const stopwords = lang === 'ru'
    ? new Set(['\u0447\u0442\u043e', '\u043a\u0430\u043a', '\u0437\u0430\u0447\u0435\u043c', '\u043f\u043e\u0447\u0435\u043c\u0443', '\u044d\u0442\u043e', '\u043c\u043d\u0435', '\u043d\u0443\u0436\u043d\u043e', '\u043d\u0430\u043f\u0438\u0448\u0438', '\u043e\u0431\u044a\u044f\u0441\u043d\u0438', '\u043f\u043e\u044f\u0441\u043d\u0438', '\u043f\u043b\u0430\u043d', '\u0438\u0434\u0435\u044f', '\u0438\u0434\u0435\u0438'])
    : new Set(['what', 'how', 'why', 'the', 'and', 'with', 'need', 'make', 'write', 'explain', 'plan', 'idea', 'ideas']);
  const filtered = tokens.filter((t) => !stopwords.has(t));
  return filtered.slice(0, 6).join(' ');
}

function seededPick(seed: string, items: string[]): string {
  const index = Math.abs(hashString(seed)) % items.length;
  return items[index];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function loadModel(): MarkovModel | null {
  if (cachedModel) return cachedModel;
  if (!fs.existsSync(MODEL_PATH)) return null;
  try {
    const raw = fs.readFileSync(MODEL_PATH, 'utf-8');
    cachedModel = JSON.parse(raw) as MarkovModel;
    if (!cachedModel.transitions || !cachedModel.starters) return null;
    return cachedModel;
  } catch {
    return null;
  }
}

function loadKnowledge(): Knowledge | null {
  if (cachedKnowledge) return cachedKnowledge;
  if (!fs.existsSync(KNOWLEDGE_PATH)) return null;
  try {
    const raw = fs.readFileSync(KNOWLEDGE_PATH, 'utf-8');
    cachedKnowledge = JSON.parse(raw) as Knowledge;
    if (!cachedKnowledge.sentences) return null;
    return cachedKnowledge;
  } catch {
    return null;
  }
}

async function tryOllama(prompt: string, lang: Lang, modelOverride?: string): Promise<string> {
  if (!OLLAMA_URL || !OLLAMA_MODEL) return '';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  const system = lang === 'ru'
    ? '\u041e\u0442\u0432\u0435\u0447\u0430\u0439 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043d\u043d\u043e \u0438 \u043f\u043e-\u0447\u0435\u043b\u043e\u0432\u0435\u0447\u0435\u0441\u043a\u0438. \u041f\u0438\u0448\u0438 \u043d\u0430 \u044f\u0437\u044b\u043a\u0435 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f. \u0415\u0441\u043b\u0438 \u043f\u0440\u043e\u0441\u044f\u0442 \u043a\u043e\u0434, \u0434\u0430\u0432\u0430\u0439 \u0447\u0438\u0441\u0442\u044b\u0439 \u043a\u043e\u0434 \u0441 \u043f\u043e\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u043c\u0438 \u043f\u0435\u0440\u0435\u043d\u043e\u0441\u0430\u043c\u0438 \u0441\u0442\u0440\u043e\u043a \u0438 \u043a\u0440\u0430\u0442\u043a\u043e\u0435 \u043f\u043e\u044f\u0441\u043d\u0435\u043d\u0438\u0435. \u0411\u0435\u0437 \u0436\u0438\u0440\u043d\u044b\u0445 \u0437\u0430\u0433\u043e\u043b\u043e\u0432\u043a\u043e\u0432 \u0438 \u043c\u0430\u0440\u043a\u0434\u0430\u0443\u043d-\u0443\u043a\u0440\u0430\u0448\u0435\u043d\u0438\u0439.'
    : 'Reply naturally and helpfully. Use the user language. If asked for code, output clean code with line breaks and a short explanation. Avoid markdown styling.';
  const model = normalizeOllamaModel(modelOverride);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false,
        options: {
          temperature: 0.6,
          num_ctx: 2048
        }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      if (OLLAMA_DEBUG) {
        const detail = await res.text();
        console.warn(`[ollama] http ${res.status}: ${detail}`);
      }
      return '';
    }
    const data = (await res.json()) as { response?: string };
    return (data.response || '').trim();
  } catch (err) {
    if (OLLAMA_DEBUG) {
      const detail = err instanceof Error ? err.message : String(err);
      console.warn(`[ollama] request failed: ${detail}`);
    }
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeModel(modelOverride?: string): 'ollama' | 'markov' {
  if (!modelOverride) return 'ollama';
  const normalized = modelOverride.toLowerCase();
  if (normalized.includes('markov')) return 'markov';
  return 'ollama';
}

function normalizeOllamaModel(modelOverride?: string): string {
  if (!modelOverride) return OLLAMA_MODEL;
  const normalized = modelOverride.toLowerCase();
  if (normalized.startsWith('ven-') || normalized.startsWith('veno-')) return OLLAMA_MODEL;
  return modelOverride;
}

function selectKnowledgeSentence(knowledge: Knowledge, prompt: string, lang: Lang): string {
  if (knowledge.lang !== 'any' && knowledge.lang !== lang) return '';
  const promptTokens = uniqueTokens(prompt);
  if (promptTokens.length === 0) return '';

  let bestScore = 0;
  let best = '';
  const limit = Math.min(knowledge.sentences.length, 1200);

  for (let i = 0; i < limit; i++) {
    const sentence = knowledge.sentences[i];
    const tokens = uniqueTokens(sentence);
    if (tokens.length < 3) continue;
    let score = 0;
    for (const token of promptTokens) {
      if (tokens.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  if (bestScore < 2) return '';
  return best.trim();
}

function uniqueTokens(text: string): string[] {
  const tokens = tokenizeWords(text);
  const seen = new Set<string>();
  for (const token of tokens) {
    if (token.length < 3) continue;
    seen.add(token);
  }
  return Array.from(seen.values());
}

function tokenizeWords(text: string): string[] {
  const tokens = text.toLowerCase().match(/[A-Za-z\u0400-\u04FF0-9']+/g);
  return tokens ? tokens : [];
}

function generateMarkov(model: MarkovModel, lang: Lang, maxTokens: number): string {
  if (model.lang !== 'any' && model.lang !== lang) return '';
  if (model.order !== 2) return '';
  if (model.starters.length === 0) return '';

  const starter = pick(model.starters).split('|');
  const tokens = [starter[0], starter[1]];

  while (tokens.length < maxTokens) {
    const key = tokens.slice(-2).join('|');
    const nextList = model.transitions[key];
    if (!nextList || nextList.length === 0) break;
    const next = pick(nextList);
    tokens.push(next);
    if (next === '.' || next === '!' || next === '?') break;
  }

  return cleanPunctuation(tokens.join(' '));
}

function cleanPunctuation(text: string): string {
  return text
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
}

function pick(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}
