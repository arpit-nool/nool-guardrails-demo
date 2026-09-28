import { DemoWorkflow } from './workflow.js';
const demo = new DemoWorkflow();
try {
  const unsafe = await demo.checkUnsafe();
  console.log(unsafe.tests.output, unsafe.output);
  if (!['blocked', 'unavailable'].includes(unsafe.verdict)) throw new Error(`Secret gate not verified: ${unsafe.verdict}. See artifacts/latest-run.json.`);
  const fixed = await demo.checkFixed();
  console.log(fixed.tests.output, fixed.output);
  if (unsafe.verdict !== 'blocked' || fixed.verdict !== 'accepted') {
    throw new Error(`Guardrail story not verified (unsafe: ${unsafe.verdict}; corrected: ${fixed.verdict}). Inspect artifacts/latest-run.json for actual Nool output.`);
  }
  console.log('VERIFIED: functional tests pass in both versions; Nool blocks the demo key and accepts the environment-variable fix.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
