# Nool Guardrails Demo

A small, screen-recordable demo of a coding agent adding a weather lookup—and putting an API key in source code. The guided story shows the proposed change, a focused Nool policy, the real Nool CLI result, and a safer environment-variable version.

> **Demo integrity:** the key is a fake marker, weather data is local sample data, and no LLM or live weather service is called. A result is called a policy block only when Nool actually reports the configured rule. If Nool stops earlier for another reason, the UI shows that reason instead.

## Run it

Requirements:

- Node.js 22 or newer
- Nool CLI installed and available as `nool`
- An unexpired Nool Editor/Planner contract for the temporary demo workspace

No npm packages need to be installed; this project uses Node.js built-ins.

```sh
npm test
npm run demo:verify
npm start
```

Open [http://127.0.0.1:4175](http://127.0.0.1:4175). Use **See the agent’s code** to move through the six steps. The Nool checks run at the two check steps. Expand **Show full terminal output** to inspect the complete CLI output.

`npm run demo:verify` checks the unsafe and corrected versions before recording. It exits successfully only when functional tests pass, Nool blocks the fake key in the first proposal, and Nool accepts the corrected proposal. Check results and raw output are saved locally in `artifacts/latest-run.json` (ignored by Git).

## Play or record

For a looping screen recording, run the checks first, then start the app with:

```sh
npm run demo:record
```

Open [http://127.0.0.1:4175/?play=loop](http://127.0.0.1:4175/?play=loop). **Play loop ∞** replays the six-step story without rerunning commands; **Pause** stops it. Saved Nool output appears at the check steps. If no result was saved, the demo labels that step **Not run** rather than implying a pass or block.

On macOS, use **Cmd+Shift+5 → Record Selected Portion** to capture the browser. Keep the full demo card in frame; expand the terminal drawer when you want to show the actual output. Verify the results before presenting the guardrail as working.

## What the story demonstrates

1. A request to add a weather lookup.
2. A deliberately unsafe implementation with a clearly fake key.
3. A Nool policy configured to reject that exact fake marker.
4. Nool evaluating the proposed change.
5. A correction that reads the key from the server environment.
6. Nool evaluating the corrected proposal.

The proposal checks run in a disposable Git/Nool workspace under the system temporary directory. They do not modify this repository. The weather preview uses local fixture data and never makes a network request.

## Current Nool access requirement

On the machine used to prepare this demo, Nool 7.8.1 Community stops both proposals before policy evaluation with:

```text
No unexpired Editor/Planner contract in this repository
```

That is an access denial—not evidence that the key policy blocked the change. Use an activated Nool build/account with the required contract, then rerun `npm run demo:verify`. Until verification reports both the expected block and acceptance, present the actual access-denial output and do not claim that the guardrail fired.

The policy in `policies/no-weather-key.yaml` is intentionally narrow: it matches the demo marker and is not a general-purpose secret scanner.

## Project files

- `public/` — screen-recordable guided demo
- `policies/no-weather-key.yaml` — focused teaching policy
- `scenarios/unsafe.txt` — prepared unsafe proposal
- `src/` and `test/` — corrected weather fixture and functional test
- `scripts/workflow.js` — isolated Git/Nool proposal workflow
- `scripts/verify.js` — verifies both expected Nool outcomes
- `server.js` — local-only demo server and API
