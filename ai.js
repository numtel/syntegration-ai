import {
  AuthStorage,
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  ModelRegistry,
  SessionManager,
  SettingsManager,
} from '@earendil-works/pi-coding-agent';

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);
const sessions = new Map();

const BASE_SYSTEM_PROMPT = `You are taking part in a synthetic Stafford Beer syntegration.
You will receive only the information your participant would realistically know from sessions they participate in.
Keep responses concise unless asked otherwise. Follow requested output formats exactly.
Do not use tools unless explicitly asked.`;

function buildSystemPrompt({systemPrompt, characterBio} = {}) {
  return [BASE_SYSTEM_PROMPT, characterBio, systemPrompt]
    .filter(Boolean)
    .join('\n\n');
}

async function createPiSession(key, options = {}) {
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
    systemPromptOverride: () => buildSystemPrompt(options),
  });
  await loader.reload();

  const { session, modelFallbackMessage } = await createAgentSession({
    cwd: process.cwd(),
    agentDir: getAgentDir(),
    authStorage,
    modelRegistry,
    resourceLoader: loader,
    sessionManager: SessionManager.inMemory(process.cwd()),
    settingsManager,
    noTools: 'all',
  });

  if (modelFallbackMessage) {
    console.warn(`[pi:${key}] ${modelFallbackMessage}`);
  }

  const state = { session, buffer: '', unsubscribe: undefined };
  state.unsubscribe = session.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      state.buffer += event.assistantMessageEvent.delta;
    }
  });
  return state;
}

async function getPiSession(key = 'moderator', options = {}) {
  if (!sessions.has(key)) {
    sessions.set(key, createPiSession(key, options));
  }
  return sessions.get(key);
}

export async function request(prompt, maxOutputTokens, options = {}) {
  const key = options.sessionKey || 'moderator';
  const state = await getPiSession(key, options);
  state.buffer = '';

  void maxOutputTokens;

  await state.session.prompt(prompt, {
    expandPromptTemplates: false,
  });

  return state.buffer.trim();
}

export async function disposeSessions() {
  for (const statePromise of sessions.values()) {
    const state = await statePromise;
    state.unsubscribe?.();
    state.session.dispose();
  }
  sessions.clear();
}
