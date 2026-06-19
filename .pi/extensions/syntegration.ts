import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { bios } from '../../bios.3.js';
import { runSyntegration, type ProgressEvent } from '../../src/syntegration.ts';

export default function syntegrationExtension(pi: ExtensionAPI) {
  pi.registerCommand('syntegrate', {
    description: 'Run a full synthetic syntegration from an opening question',
    handler: async (args, ctx) => {
      await ctx.waitForIdle();

      const inlineQuestion = args?.trim();
      const triggerQuestion = inlineQuestion || await ctx.ui.input(
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
        content: `Starting syntegration.\n\nOpening question: ${triggerQuestion}`,
      });
      push('Starting syntegration.');
      push(`Nested participant sessions will use model: ${modelLabel}`);

      try {
        const result = await runSyntegration({
          triggerQuestion: triggerQuestion.trim(),
          bios,
          outputDir: `${ctx.cwd}/out`,
          model: ctx.model,
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
