import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from '@earendil-works/pi-coding-agent';
import { decodeOptimizer } from '../hill.js';
import { optimizer } from '../optimizer.js';

export type ProgressEvent = {
  type: 'status' | 'message' | 'artifact';
  text: string;
};

export type SyntegrationOptions = {
  triggerQuestion: string;
  bios: string[];
  outputDir?: string;
  skipSummary?: boolean;
  model?: any;
  thinkingLevel?: any;
  onProgress?: (event: ProgressEvent) => void | Promise<void>;
};

type SessionState = {
  session: any;
  buffer: string;
  unsubscribe?: () => void;
};

function getMessages(session: any) {
  return session.messages ?? session.agent?.state?.messages ?? [];
}

function isAssistantMessage(value: any): boolean {
  return value?.role === 'assistant' || value?.message?.role === 'assistant';
}

function extractMessageText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractMessageText).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    if (typeof value.content === 'string') return value.content;
    if (value.content !== undefined) return extractMessageText(value.content);
    if (value.message !== undefined) return extractMessageText(value.message);
    if (value.parts !== undefined) return extractMessageText(value.parts);
  }
  return '';
}

const desireRating = 'Respond with only your thoughts (no introduction of yourself) at this point in the conversation and put a number from 0-9 as the absolutely last character returned (after the last period, only the integer digit) which correlates to your desire to respond again.';

class PiRequester {
  private authStorage = AuthStorage.create();
  private modelRegistry = ModelRegistry.create(this.authStorage);
  private sessions = new Map<string, Promise<SessionState>>();

  constructor(private options: { model?: any; thinkingLevel?: any } = {}) {}

  async request(prompt: string, maxOutputTokens: number, options: { sessionKey?: string; characterBio?: string } = {}) {
    const key = options.sessionKey ?? 'moderator';
    const state = await this.getSession(key, options.characterBio);
    state.buffer = '';
    void maxOutputTokens;
    const beforeCount = getMessages(state.session).length;
    await state.session.prompt(prompt, { expandPromptTemplates: false });
    const streamed = state.buffer.trim();
    if (streamed) return streamed;

    const newMessages = getMessages(state.session).slice(beforeCount);
    const assistantText = [...newMessages].reverse()
      .filter(isAssistantMessage)
      .map((message) => extractMessageText(message))
      .find((text) => text.trim().length > 0);
    return assistantText?.trim() ?? '';
  }

  async dispose() {
    for (const statePromise of this.sessions.values()) {
      const state = await statePromise;
      state.unsubscribe?.();
      state.session.dispose();
    }
    this.sessions.clear();
  }

  private async getSession(key: string, characterBio?: string) {
    if (!this.sessions.has(key)) {
      this.sessions.set(key, this.createSession(key, characterBio));
    }
    return this.sessions.get(key)!;
  }

  private async createSession(key: string, characterBio?: string): Promise<SessionState> {
    const settingsManager = SettingsManager.inMemory({
      compaction: { enabled: true },
      retry: { enabled: true, maxRetries: 5 },
    });
    const loader = new DefaultResourceLoader({
      cwd: process.cwd(),
      agentDir: getAgentDir(),
      settingsManager,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noContextFiles: true,
      systemPromptOverride: () => [
        'You are taking part in a synthetic Stafford Beer syntegration.',
        'You will receive only the information your participant would realistically know from sessions they participate in.',
        'Keep responses concise unless asked otherwise. Follow requested output formats exactly.',
        'Do not use tools unless explicitly asked.',
        characterBio,
      ].filter(Boolean).join('\n\n'),
    });
    await loader.reload();
    const { session, modelFallbackMessage } = await createAgentSession({
      cwd: process.cwd(),
      agentDir: getAgentDir(),
      model: this.options.model,
      thinkingLevel: this.options.thinkingLevel,
      authStorage: this.authStorage,
      modelRegistry: this.modelRegistry,
      resourceLoader: loader,
      sessionManager: SessionManager.inMemory(process.cwd()),
      settingsManager,
      noTools: 'all',
    });
    if (!session.model) throw new Error('No Pi model is selected/available for nested syntegration sessions. Select a model with /model or login with /login.');
    if (modelFallbackMessage) console.warn(`[syntegration:${key}] ${modelFallbackMessage}`);

    const state: SessionState = { session, buffer: '' };
    state.unsubscribe = session.subscribe((event: any) => {
      if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
        state.buffer += event.assistantMessageEvent.delta;
      }
    });
    return state;
  }
}

export async function runSyntegration(options: SyntegrationOptions) {
  const { triggerQuestion, bios: characterBios } = options;
  const outputDir = options.outputDir ?? join(process.cwd(), 'out');
  const skipSummary = options.skipSummary ?? false;
  const requester = new PiRequester({ model: options.model, thinkingLevel: options.thinkingLevel });
  let progress = 0;
  mkdirSync(outputDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const checkpointPath = join(outputDir, `syntegration-${stamp}.partial.json`);
  const checkpointMdPath = join(outputDir, `syntegration-${stamp}.partial.md`);
  const finalJsonPath = join(outputDir, `syntegration-${stamp}.json`);
  const finalMdPath = join(outputDir, `syntegration-${stamp}.md`);
  const state: any = { triggerQuestion, phase: 'starting', convos: [] };

  const saveCheckpoint = async (phase: string) => {
    state.phase = phase;
    state.updatedAt = new Date().toISOString();
    writeFileSync(checkpointPath, JSON.stringify(state, null, 2));
    writeFileSync(checkpointMdPath, renderMarkdown(state));
    await emit('artifact', `Checkpoint saved: ${checkpointPath}`);
  };

  const emit = async (type: ProgressEvent['type'], text: string) => options.onProgress?.({ type, text });
  const aiRequest = async (prompt: string, maxOutputTokens: number, requestOptions: { sessionKey?: string; characterBio?: string } = {}) => {
    await emit('status', `AI request: ${requestOptions.sessionKey ?? 'moderator'} (${Math.round((progress / (3 * 6 * 2)) * 10000) / 100}%)`);
    return requester.request(prompt, maxOutputTokens, requestOptions);
  };

  try {
    await emit('status', 'Generating statements of importance...');
    const sis = await generateSIs(characterBios, triggerQuestion, aiRequest, emit);
    state.sis = sis;
    const flatSis = sis.flat();
    state.flatSis = flatSis;
    await saveCheckpoint('generated-sis');

    await emit('status', 'Finding duplicate/similar SIs...');
    const similars = sanitizeSimilarGroups(await dupeSIs(flatSis, aiRequest), flatSis.length);
    const toRemove = similars.flat();
    const splicedSis = flatSis.filter((_x, i) => !toRemove.includes(i));

    await emit('status', `Combining ${similars.length} similar SI group(s)...`);
    const fixedSimilars = await combineSIs(flatSis, similars, aiRequest);
    const sisForSign = [...fixedSimilars, ...splicedSis];
    state.similars = similars;
    state.fixedSimilars = fixedSimilars;
    state.sisForSign = sisForSign;
    await emit('message', `Generated ${flatSis.length} raw SI(s); ${sisForSign.length} after dedupe.`);
    if (sisForSign.length < 12) {
      await emit('status', `Duplicate detection was too aggressive (${sisForSign.length} SIs). Falling back to uncombined SIs.`);
      sisForSign.splice(0, sisForSign.length, ...flatSis);
      state.sisForSign = sisForSign;
    }
    await saveCheckpoint('deduped-sis');

    await emit('status', 'Participants are signing SIs...');
    const signsByCharacter = await signSIs(sisForSign, characterBios, triggerQuestion, aiRequest, emit);
    state.signsByCharacter = signsByCharacter;
    await saveCheckpoint('signed-sis');
    const siSignTally: Record<number, number> = {};
    for (const signs of signsByCharacter) {
      for (const index of signs) siSignTally[index] = (siSignTally[index] ?? 0) + 1;
    }
    const sortedSigns = Object.entries(siSignTally)
      .map(([key, tally]) => ({ key: Number(key), tally }))
      .filter((item) => Number.isInteger(item.key) && item.key >= 0 && item.key < sisForSign.length)
      .sort((a, b) => b.tally - a.tally);
    if (sortedSigns.length < 12) {
      await emit('status', `Only ${sortedSigns.length} unique signed SI(s); filling top 12 from remaining SIs.`);
      const signed = new Set(sortedSigns.map((item) => item.key));
      for (let key = 0; key < sisForSign.length && sortedSigns.length < 12; key++) {
        if (!signed.has(key)) sortedSigns.push({ key, tally: 0 });
      }
    }
    if (sortedSigns.length < 12) throw new Error(`Need at least 12 SIs, only have ${sortedSigns.length}.`);
    const top12 = sortedSigns.slice(0, 12);
    state.top12 = top12;
    await saveCheckpoint('selected-top12');

    await emit('status', 'Participants are scoring top SIs...');
    const scoresByCharacter = await scoreSIs(sisForSign, characterBios, top12, aiRequest, emit);
    state.scoresByCharacter = scoresByCharacter;
    const rows = await optimizer(scoresByCharacter);
    state.optimizerRows = rows;
    const { schedule, topicParticipants } = decodeOptimizer(rows);
    state.schedule = schedule;
    state.topicParticipants = topicParticipants;
    await saveCheckpoint('scheduled');

    await emit('status', 'Schedule created. Running 36 conversations...');
    const config = { sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion, skipSummary, aiRequest, emit };
    const convos: any[] = state.convos;
    for (let iteration = 0; iteration < 3; iteration++) {
      for (let sessionIdx = 0; sessionIdx < 6; sessionIdx++) {
        for (let polarity = 0; polarity < 2; polarity++) {
          const topicIndex = schedule[sessionIdx][polarity];
          await emit('status', `Iteration ${iteration + 1}/3, session ${sessionIdx + 1}${polarity ? 'B' : 'A'}, topic ${topicIndex + 1}`);
          const seg1 = await convoSeg1(sessionIdx, polarity, convos, config);
          const critique = await convoCritique(sessionIdx, polarity, seg1, convos, config);
          const seg2 = await convoSeg2(sessionIdx, polarity, seg1, critique, convos, config);
          const convo: any = {
            iteration,
            index: topicIndex,
            si: sisForSign[top12[topicIndex].key],
            seg1,
            critique,
            seg2,
          };
          if (!skipSummary) convo.summary = await summarizeConvo(convo, aiRequest);
          convos.push(convo);
          state.convos = convos;
          progress++;
          await saveCheckpoint(`conversation-${progress}-of-36`);
        }
      }
    }

    const result = { ...state, phase: 'complete', triggerQuestion, sisForSign, top12, schedule, topicParticipants, convos };
    writeFileSync(finalJsonPath, JSON.stringify(result, null, 2));
    writeFileSync(finalMdPath, renderMarkdown(result));
    await emit('artifact', `Wrote ${finalJsonPath}`);
    await emit('artifact', `Wrote ${finalMdPath}`);
    return { jsonPath: finalJsonPath, mdPath: finalMdPath, checkpointPath, checkpointMdPath, result };
  } finally {
    await requester.dispose();
  }
}

function extractNumberFromEnd(input: string): [string, number] {
  const match = input.match(/^(.*?)(?:[\(\[])?\s*(\d+)(?:[\)\].])?\s*\.?$/s);
  if (!match) return [input, 5];
  let prefix = match[1].replace(/\s+$/, '');
  if (!prefix.endsWith('.')) prefix += '.';
  return [prefix, Number.parseInt(match[2], 10)];
}

function rand(max: number) { return Math.floor(Math.random() * max); }

function convoHistory(charIndex: number, convos: any[], config: any) {
  const { topicParticipants, skipSummary } = config;
  const myTopics: number[] = [];
  for (let i = 0; i < topicParticipants.length; i++) {
    if (topicParticipants[i].participants.includes(charIndex) || topicParticipants[i].critics.includes(charIndex)) myTopics.push(i);
  }
  const myConvos = convos.filter((convo) => myTopics.includes(convo.index));
  return myConvos.map((convo) => skipSummary ? `
## Begin Previous Conversation Transcript ${convo.iteration}/${convo.index}
Statement of Importance: ${convo.si}
${convo.seg1}\n${convo.critique}\n${convo.seg2}
## End Previous Conversation Transcript ${convo.iteration}/${convo.index}` : `
## Begin Previous Conversation Summary ${convo.iteration}/${convo.index}
Statement of Importance: ${convo.si}
${convo.summary}
## End Previous Conversation Summary ${convo.iteration}/${convo.index}`).join('\n');
}

async function summarizeConvo(convo: any, aiRequest: any) {
  return aiRequest(`
Summarize the following Syntegration conversation for this statement of Importance: ${convo.si}
Return only the summary without any extra introduction or closing. Use all the available tokens.
${convo.seg1}\n${convo.critique}\n${convo.seg2}`, 1500);
}

async function convoSeg1(sessionIndex: number, polarity: number, convos: any[], config: any) {
  const { sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion, aiRequest, emit } = config;
  const charCtx: Record<string, string> = {};
  const charSeenCtx: Record<string, number> = {};
  const curSI = sisForSign[top12[schedule[sessionIndex][polarity]].key];
  const curConvo = topicParticipants[schedule[sessionIndex][polarity]];
  const charDesires: Record<string, number> = {};
  let curPart = curConvo.participants[rand(curConvo.participants.length)];
  for (let convoLen = 0; convoLen < 25; convoLen++) {
    const curCtx = charCtx[curPart] ?? '';
    const unseenCtx = curCtx.slice(charSeenCtx[curPart] ?? 0).trim();
    const prompt = `You are participant #${curPart}.
Opening question:
${triggerQuestion}
${convoHistory(curPart, convos, config)}
Statement of importance:
${curSI}
${unseenCtx ? `New contributions since your last view:
${unseenCtx}` : (curCtx ? 'No new contributions since your last turn.' : 'You are starting the conversation.')}
Limit your response to 3 sentences. Don't always conform to groupthink. Be critical of others' responses. ${desireRating}`;
    charSeenCtx[curPart] = curCtx.length;
    const rawOut = await aiRequest(prompt, 250, { sessionKey: `character-${curPart}`, characterBio: characterBios[curPart] });
    const [response, responseDesire] = extractNumberFromEnd(rawOut);
    await emit('message', `#${curPart}: ${response}`);
    charDesires[curPart] = responseDesire;
    for (const convoChar of [...curConvo.participants, ...curConvo.critics]) charCtx[convoChar] = (charCtx[convoChar] || '') + `
#${curPart}: ${response}`;
    curPart = nextParticipant(curConvo.participants, charDesires);
  }
  return charCtx[curConvo.participants[0]];
}

async function convoCritique(sessionIndex: number, polarity: number, seg1Transcript: string, convos: any[], config: any) {
  const { sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion, aiRequest, emit } = config;
  const curSI = sisForSign[top12[schedule[sessionIndex][polarity]].key];
  const curConvo = topicParticipants[schedule[sessionIndex][polarity]];
  const charCtx: Record<string, string> = {};
  const charSeenCtx: Record<string, number> = {};
  const already: number[] = [];
  let curPart = curConvo.critics[rand(curConvo.critics.length)];
  for (let convoLen = 0; convoLen < 5; convoLen++) {
    const curCtx = charCtx[curPart] ?? '';
    const unseenCtx = curCtx.slice(charSeenCtx[curPart] ?? 0).trim();
    const prompt = `You are critic #${curPart}.
Opening question:
${triggerQuestion}
${convoHistory(curPart, convos, config)}
Statement of importance:
${curSI}
Participant segment to critique:
${seg1Transcript}
${unseenCtx ? `Other critics since your last view:
${unseenCtx}
Don't repeat these same points of critique.` : 'You are starting the critique.'}
Limit your critique to 3 sentences. Play devil's advocate. Look for biases, strawman arguments, etc. Respond with only your critique (no introduction of yourself).`;
    charSeenCtx[curPart] = curCtx.length;
    const response = (await aiRequest(prompt, 250, { sessionKey: `character-${curPart}`, characterBio: characterBios[curPart] })).trim();
    await emit('message', `Critic #${curPart}: ${response}`);
    for (const convoChar of [...curConvo.participants, ...curConvo.critics]) charCtx[convoChar] = (charCtx[convoChar] || '') + `
#${curPart}: ${response}`;
    already.push(curPart);
    const choices = curConvo.critics.filter((x: number) => !already.includes(x));
    if (choices.length) curPart = choices[rand(choices.length)];
  }
  return charCtx[curConvo.critics[0]];
}

async function convoSeg2(sessionIndex: number, polarity: number, seg1Transcript: string, critiqueTranscript: string, convos: any[], config: any) {
  const { sisForSign, top12, schedule, topicParticipants, characterBios, triggerQuestion, aiRequest, emit } = config;
  const charCtx: Record<string, string> = {};
  const charSeenCtx: Record<string, number> = {};
  const curSI = sisForSign[top12[schedule[sessionIndex][polarity]].key];
  const curConvo = topicParticipants[schedule[sessionIndex][polarity]];
  const charDesires: Record<string, number> = {};
  let curPart = curConvo.participants[rand(curConvo.participants.length)];
  for (let convoLen = 0; convoLen < 15; convoLen++) {
    const curCtx = charCtx[curPart] ?? '';
    const unseenCtx = curCtx.slice(charSeenCtx[curPart] ?? 0).trim();
    const prompt = `You are participant #${curPart}.
Opening question:
${triggerQuestion}
${convoHistory(curPart, convos, config)}
Statement of importance:
${curSI}
First segment:
${seg1Transcript}
Critique:
${critiqueTranscript}
${unseenCtx ? `New second-segment contributions since your last view:
${unseenCtx}` : (curCtx ? 'No new second-segment contributions since your last turn.' : 'You are starting the second segment.')}
${convoLen > 10 ? `The conversation is nearing its end. Reflect shared disagreements and agreements. Limit your response to 3 sentences. ${desireRating}` : `Limit your response to 3 sentences. Don't always conform to groupthink. Be critical of others' responses. ${desireRating}`}`;
    charSeenCtx[curPart] = curCtx.length;
    const rawOut = await aiRequest(prompt, 250, { sessionKey: `character-${curPart}`, characterBio: characterBios[curPart] });
    const [response, responseDesire] = extractNumberFromEnd(rawOut);
    await emit('message', `#${curPart}: ${response}`);
    charDesires[curPart] = responseDesire;
    for (const convoChar of [...curConvo.participants, ...curConvo.critics]) charCtx[convoChar] = (charCtx[convoChar] || '') + `
#${curPart}: ${response}`;
    curPart = nextParticipant(curConvo.participants, charDesires);
  }
  return charCtx[curConvo.participants[0]];
}

function nextParticipant(participants: number[], charDesires: Record<string, number>) {
  if (Object.keys(charDesires).length < 5) {
    const already = Object.keys(charDesires).map(Number);
    const choices = participants.filter((x) => !already.includes(x));
    return choices[rand(choices.length)];
  }
  const top = Object.entries(charDesires).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const key of Object.keys(charDesires)) charDesires[key]++;
  return Number(top[rand(top.length)][0]);
}

async function scoreSIs(sisForSign: string[], characterBios: string[], top12: any[], aiRequest: any, emit: any) {
  const outScores: number[][] = [];
  for (let charIndex = 0; charIndex < characterBios.length; charIndex++) {
    await emit('status', `Character #${charIndex} scoring SIs...`);
    const characterBio = characterBios[charIndex];
    const rawScores = await aiRequest(`${characterBio}
For each of these syntegration "statements of importance" give a score of 1 to 10.
Scores should cover the wide range of possibilities. You should have some that are below 5.
Scores should reflect who you are as a person and your areas of expertise.
Return only the list of scores as numbers in a comma-separated list. The output should only contain the digits and commas.
${top12.map((item) => sisForSign[item.key]).join('\n')}`, 100, { sessionKey: `character-${charIndex}`, characterBio });
    outScores.push(rawScores.split(',').map((x: string) => Number(x.trim())));
  }
  return outScores;
}

async function dupeSIs(flatSis: string[], aiRequest: any) {
  const rawSigns = await aiRequest(`Of these syntegration "statements of importance," (SI) return only a comma-separated list of the numbers of the SIs that are similar and could be combined. Your output should only include the numbers, commas and newlines. Each line should be one small set of SIs to combine. Do not group broad themes; only group near-duplicates. If there are no near-duplicates, return nothing.
${flatSis.map((si, index) => `${index + 1}. ${si}`).join('\n')}`, 2500);
  return rawSigns.split('\n')
    .map((line: string) => parseNumberList(line).map((n) => n - 1))
    .filter((xs: number[]) => xs.length >= 2 && xs.every((n) => Number.isInteger(n) && n >= 0 && n < flatSis.length));
}

function parseNumberList(text: string) {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

function sanitizeSimilarGroups(groups: number[][], siCount: number) {
  const out: number[][] = [];
  const used = new Set<number>();
  for (const group of groups) {
    const unique = [...new Set(group)].filter((n) => Number.isInteger(n) && n >= 0 && n < siCount);
    if (unique.length < 2 || unique.length > 5) continue;
    if (unique.some((n) => used.has(n))) continue;
    out.push(unique);
    for (const n of unique) used.add(n);
  }
  // If the model tried to merge a large fraction of all SIs, reject duplicate merging.
  if (used.size > siCount * 0.35) return [];
  return out;
}

async function combineSIs(flatSis: string[], similars: number[][], aiRequest: any) {
  const outSis: string[] = [];
  for (const similar of similars) {
    const rawCombined = await aiRequest(`Combine these similar syntegration "statements of importance" into a single SI:
${similar.map((index) => flatSis[index]).join('\n')}
Relevance: Each SI must relate directly to the overall Opening Question guiding the Syntegration. Keep the main focus in mind.
Conciseness: Aim for short, impactful statements, ideally a single sentence (the protocol suggests max 10 words). Avoid complex clauses or multiple ideas in one SI. Clarity is key.
Provocative, Not Conclusive: Good SIs often raise questions, highlight tensions, or propose a perspective that isn't universally accepted yet. They should invite discussion, not close it down. Avoid "motherhood" statements.
Return only the single SI in the output.`, 500);
    outSis.push(rawCombined.trim());
  }
  return outSis;
}

async function signSIs(sisForSign: string[], characterBios: string[], triggerQuestion: string, aiRequest: any, emit: any) {
  const outSigns: number[][] = [];
  for (let charIndex = 0; charIndex < characterBios.length; charIndex++) {
    await emit('status', `Character #${charIndex} signing SIs...`);
    const characterBio = characterBios[charIndex];
    const rawSigns = await aiRequest(`${characterBio}
Of these syntegration "statements of importance," (SI) choose which ones you believe are worthy of discussion for this trigger question:
${triggerQuestion}
${sisForSign.map((si, index) => `${index + 1}. ${si}`).join('\n')}
Select a maximum of 15 of the very best SIs. If there are less than 15 that aren't amazing return fewer selections. You must be very excited about these SIs.
Return only a comma-separated list of the numbers of each SI that you have selected. There should be no other text in the output except the numbers and the commas. Do not include any introductory text about your character in the response.`, 500, { sessionKey: `character-${charIndex}`, characterBio });
    outSigns.push(parseNumberList(rawSigns).map((n) => n - 1).filter((n: number) => Number.isInteger(n) && n >= 0 && n < sisForSign.length));
  }
  return outSigns;
}

async function generateSIs(characterBios: string[], triggerQuestion: string, aiRequest: any, emit: any) {
  const allSis: string[][] = [];
  for (let charIndex = 0; charIndex < characterBios.length; charIndex++) {
    await emit('status', `Character #${charIndex} generating SIs...`);
    const characterBio = characterBios[charIndex];
    const prompt = `${characterBio}
Generate 3 syntegration "statements of importance" related to this trigger question:
${triggerQuestion}
Return only the statements themselves. Each one should be on its own line. There should be no extra output. Do not number the statements.
Relevance: Each SI must relate directly to the overall Opening Question guiding the Syntegration. Keep the main focus in mind.
Conciseness: Aim for short, impactful statements, ideally a single sentence (the protocol suggests max 10 words). Avoid complex clauses or multiple ideas in one SI. Clarity is key.
Provocative, Not Conclusive: Good SIs often raise questions, highlight tensions, or propose a perspective that isn't universally accepted yet. They should invite discussion, not close it down. Avoid "motherhood" statements.`;
    let rawSI = await aiRequest(prompt, 500, { sessionKey: `character-${charIndex}`, characterBio });
    let sis = parseStatementLines(rawSI).slice(0, 3);
    if (sis.length === 0) {
      await emit('status', `Character #${charIndex} returned no parseable SIs; retrying once...`);
      rawSI = await aiRequest(`${prompt}\n\nPrevious response was empty or unparseable. Return exactly 3 short lines and nothing else.`, 500, { sessionKey: `character-${charIndex}`, characterBio });
      sis = parseStatementLines(rawSI).slice(0, 3);
    }
    await emit('message', `Character #${charIndex} SIs:\n${sis.map((si, i) => `  ${i + 1}. ${si}`).join('\n') || `  (none parsed; raw response length ${rawSI.length})`}`);
    allSis.push(sis);
  }
  const total = allSis.flat().length;
  if (total < 12) throw new Error(`Only generated ${total} parseable SI(s). Check Pi model/auth output; need at least 12.`);
  return allSis;
}

function parseStatementLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '').trim())
    .filter((line) => line && !/^```/.test(line) && !/^statements? of importance/i.test(line));
}

function renderMarkdown(result: any) {
  return `# Syntegration\n\n## Opening Question\n\n${result.triggerQuestion}\n\n## Top Statements\n\n${result.top12.map((item: any, i: number) => `${i + 1}. ${result.sisForSign[item.key]} (${item.tally} signatures)`).join('\n')}\n\n## Conversations\n\n${result.convos.map((convo: any) => `### Iteration ${convo.iteration + 1}, Topic ${convo.index + 1}\n\n**SI:** ${convo.si}\n\n${convo.summary ? `**Summary:** ${convo.summary}\n\n` : ''}#### Segment 1\n\n${convo.seg1}\n\n#### Critique\n\n${convo.critique}\n\n#### Segment 2\n\n${convo.seg2}`).join('\n\n')}\n`;
}
