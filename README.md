# Nool guardrails demo

A 90-second, screen-recordable weather feature example. Viewers see a deliberately fake API key in the code, the matching blocking Nool rule, a live Nool CLI proposal check, the safer environment-variable version, and a second proposal check. Weather results use local sample data; the app makes no external API calls and uses no real credentials.

## Run the demo

Requirements: Node.js 22+ and a Nool CLI configured with an unexpired Editor/Planner contract for this repository. The current CLI must return an actual policy denial for the first version and accept the corrected proposal. `npm run demo:verify` checks those conditions and exits with an error if Nool stops for another reason.

```sh
npm run demo:verify
npm start
```

Open `http://127.0.0.1:4175`. The guided screen pauses after each explanation and runs the Nool check at the relevant step. Expand “Show full terminal output” to see the complete CLI output. Results are saved locally to `artifacts/latest-run.json` for troubleshooting.

**Play loop ∞** replays the six screens indefinitely. When real check results are saved, the loop displays them; otherwise it marks the check “Not run” and never invents a result. Playback does not rerun Nool. You can also open `http://127.0.0.1:4175/?play=loop` to start replay automatically.

The checks run in a temporary Git/Nool workspace. The unsafe example is a prepared teaching scenario, not an actual model-generated change. The demo does not call an LLM or use a real weather service.

## Recording

1. Stop any already running copy of the demo. Run `npm run demo:verify` first. Do not record the guardrail as working unless it reports that Nool blocked the fake key and accepted the corrected proposal.
2. Run `npm run demo:record`. Open `http://127.0.0.1:4175` and begin a screen recording (on macOS, press `Cmd+Shift+5` and choose Record Selected Portion).
3. Click through the six steps. Pause on the red highlighted key, the actual policy denial, then the environment-variable fix and accepted proposal.
4. Expand “Inspect the actual command output” for the terminal evidence. Stop the recording after the final result.

## Current machine limitation

On the machine used to prepare this demo, Nool 7.8.1 Community returns “No unexpired Editor/Planner contract” before evaluating either code version. That is an account access denial, not the secret policy. Use an activated Nool build/account to record the intended blocked/accepted story. Until then, the screen explicitly identifies the early denial and must not be presented as proof that the secret rule fired.

The teaching policy in `policies/no-weather-key.yaml` blocks the exact fake marker used in this demo. It is intentionally narrow; it does not claim to detect every possible secret.
