// Genuine child-process participant for immutable store race tests.
import { openFilesystemDesignStore } from '../../dist/macros/store.js';

const [projectRoot, recipe] = process.argv.slice(2);
if (!projectRoot || !recipe || !process.send) {
  throw new Error('Expected project root, recipe ref, and IPC');
}

const store = await openFilesystemDesignStore(projectRoot, { create: false });
process.send({ type: 'ready' });

process.on('message', async message => {
  if (!message || message.type !== 'go') return;
  try {
    const receipt = await store.apply({
      designId: 'cross-process',
      expectedRevision: 0,
      operationId: 'op-concurrent',
      operations: [{ op: 'instantiate_recipe', recipe, pagePrefix: 'proc' }],
    });
    process.send?.({ type: 'result', receipt });
  } catch (error) {
    process.send?.({
      type: 'error',
      code: error && typeof error === 'object' && 'code' in error ? error.code : 'UNKNOWN',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
