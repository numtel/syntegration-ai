import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { bios } from '../../bios.3.js';
import { runSyntegration, type ProgressEvent } from '../../src/syntegration.ts';

function resolveResumePath(cwd: string, requested?: string) {
  if (requested) {
    const path = requested.startsWith('/') ? requested : join(cwd, requested);
    if (!existsSync(path)) throw new Error(`Checkpoint not found: ${path}`);
    return path;
  }

  const outDir = join(cwd, 'out');
  if (!existsSync(outDir)) throw new Error(`No out/ directory found at ${outDir}`);
  const partials = readdirSync(outDir)
    .filter((name) => name.endsWith('.partial.json'))
    .map((name) => join(outDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!partials[0]) throw new Error(`No .partial.json checkpoints found in ${outDir}`);
  return partials[0];
}

export default function syntegrationExtension(pi: ExtensionAPI) {
  pi.registerCommand('syntegrate', {
    description: 'Run a full synthetic syntegration from an opening question',
    handler: async (args, ctx) => {
      await ctx.waitForIdle();

      const rawArgs = args?.trim() ?? '';
      const resumeMatch = rawArgs.match(/^--resume(?:\s+(.+))?$/);
      const resumePath = resumeMatch ? resolveResumePath(ctx.cwd, resumeMatch[1]?.trim()) : undefined;
      const resumedState = resumePath ? JSON.parse(readFileSync(resumePath, 'utf8')) : undefined;
      const inlineQuestion = resumeMatch ? '' : rawArgs;
      const triggerQuestion = resumedState?.triggerQuestion || inlineQuestion || await ctx.ui.input(
        'Opening question',
        'How should we...?'
      );

      if (!triggerQuestion?.trim()) {
        ctx.ui.notify('Syntegration cancelled: no opening question provided.', 'info');
        return;
      }

      const liveLog: string[] = [];
      const push = (line: string) => {
        const timestamp = new Date().toLocaleTimeString();
        liveLog.push(`[${timestamp}] ${line}`);
        if (liveLog.length > 18) liveLog.shift();
        ctx.ui.setWidget('syntegration', [
          'Synthetic syntegration running...',
          '',
          ...liveLog,
        ]);
        pi.sendMessage({
          customType: 'syntegration',
          display: true,
          content: line,
        });
      };

      const model = ctx.model as { provider?: string; id?: string; name?: string } | undefined;
      const modelLabel = model ? `${model.provider ?? 'unknown'}/${model.id ?? model.name ?? 'unknown'}` : 'Pi default model fallback';

      pi.setSessionName(`Syntegration: ${triggerQuestion.slice(0, 60)}`);
      pi.sendMessage({
        customType: 'syntegration',
        display: true,
        content: `${resumePath ? 'Resuming' : 'Starting'} syntegration.\n\nOpening question: ${triggerQuestion}${resumePath ? `\n\nCheckpoint: ${resumePath}` : ''}`,
      });
      push(resumePath ? `Resuming from checkpoint: ${resumePath}` : 'Starting syntegration.');
      push(`Nested participant sessions will use model: ${modelLabel}`);

      try {
        const result = await runSyntegration({
          triggerQuestion: triggerQuestion.trim(),
          bios,
          outputDir: `${ctx.cwd}/out`,
          model: ctx.model,
          resumePath,
          onProgress: (event: ProgressEvent) => {
            push(event.text);
          },
        });

        ctx.ui.setWidget('syntegration', undefined);
        const done = `Syntegration complete.\n\nJSON: ${result.jsonPath}\nMarkdown: ${result.mdPath}`;
        pi.sendMessage({ customType: 'syntegration', display: true, content: done });
        ctx.ui.notify('Syntegration complete.', 'info');
      } catch (error) {
        ctx.ui.setWidget('syntegration', undefined);
        const message = error instanceof Error ? error.message : String(error);
        pi.sendMessage({
          customType: 'syntegration',
          display: true,
          content: `Syntegration failed: ${message}`,
        });
        ctx.ui.notify(`Syntegration failed: ${message}`, 'error');
      }
    },
  });
}
