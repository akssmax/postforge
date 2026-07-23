#!/usr/bin/env node
// Runs offline golden brief fixtures against the v2 campaign-first planner.
// Invoke: npm run test:golden-briefs
import { runAllGoldenBriefs } from "../src/lib/social-tool/engine/goldenBriefs";

const { passed, failed, results } = runAllGoldenBriefs();

for (const result of results) {
  if (result.ok) {
    console.log(`PASS ${result.id}`, result.actual);
  } else {
    console.error(`FAIL ${result.id}`, result.failures, result.actual);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
