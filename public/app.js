const $ = selector => document.querySelector(selector);
let phase = 0, sources, pending = false, lastVerdict, savedResults = {}, loopTimer;
const chapters = [
  ['THE REQUEST', '“Add a weather lookup.”', 'A normal request for a coding agent. Show the weather for a selected city.', 'The rule we want to enforce: keep the API key outside source code.', 'See the agent’s code →'],
  ['THE MISTAKE', 'The key is in the code.', 'The weather lookup works. But anyone who can read this file can also read the key.', 'The highlighted value is deliberately fake. Imagine a real credential in the same place.', 'Show the rule →'],
  ['THE RULE', '“Keep this key out.”', 'This small Nool policy rejects changes containing the demo key. It is configured before checking the code.', 'This is a focused teaching rule, not a complete scanner for every kind of secret.', 'Run the real Nool check →'],
  ['THE CHECK', 'Checking the change…', 'The local Nool CLI is evaluating the proposed code.', 'The result below will come from the actual command.', 'Waiting for Nool…'],
  ['THE FIX', 'Read the key from the server.', 'The corrected code reads WEATHER_API_KEY from the server environment. It never sends that key to the browser.', 'The same weather feature remains available. Only credential handling changes.', 'Check the corrected code →'],
  ['THE RESULT', 'Checking the correction…', 'The same policy now evaluates the corrected version.', 'Functional tests and policy checks answer different questions.', 'Waiting for Nool…']
];
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function showCode(source, highlight) {
  $('#code').innerHTML = source.trimEnd().split('\n').map((line, i) => `<span class="line ${line.includes('const apiKey') ? highlight : ''}"><span class="num">${i + 1}</span>${escape(line)}</span>`).join('');
}
function render() {
  const [chapter, title, explain, callout, button] = chapters[phase];
  $('#chapter').textContent = `0${phase + 1} / ${chapter}`;
  $('#title').textContent = title; $('#explain').textContent = explain; $('#callout').textContent = callout;
  $('#next').textContent = button;
  $('#prompt').hidden = phase !== 0;
  $('#code').hidden = ![1, 2, 4].includes(phase);
  $('#terminal').hidden = ![3, 5].includes(phase);
  $('#file-label').textContent = phase === 0 ? 'Feature request' : phase === 2 ? 'policies/no-weather-key.yaml' : [3, 5].includes(phase) ? 'Actual local terminal output' : 'src/weather.js';
  if ([1, 2, 4].includes(phase)) showCode(phase === 1 ? sources.unsafe : phase === 2 ? sources.policy : sources.fixed, phase === 1 ? 'danger' : 'safe');
  $('#badge').textContent = 'STEP ' + (phase + 1);
  document.querySelectorAll('#steps li').forEach((li, i) => { li.classList.toggle('active', i === phase); li.classList.toggle('done', i < phase); });
}
async function request(route) {
  const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function unavailable(result) {
  $('#title').textContent = 'Nool stopped before the secret check.';
  $('#explain').textContent = 'The local CLI reports that this repo needs an Editor/Planner contract. The key rule has not run yet.';
  $('#callout').textContent = 'This is an access check, not a secret-policy result. We’ll keep that distinction visible.';
  $('#next').textContent = phase === 3 ? 'Show the safer code →' : 'Check could not complete';
  $('#next').disabled = phase !== 3;
  $('#output').textContent = result.output.split('\n').filter(line => /contract|Enterprise|Error:|denied/i.test(line)).join('\n');
}
function showRecordedResult(kind, result) {
  phase = kind === 'unsafe' ? 3 : 5;
  lastVerdict = result.verdict;
  render();
  document.body.dataset.verdict = result.verdict;
  $('#file-label').textContent = 'Actual local terminal output';
  $('#badge').textContent = result.verdict.toUpperCase();
  $('#command').textContent = `$ ${result.command}`;
  $('#raw').textContent = `${result.tests?.command || 'Functional tests'}\n${result.tests?.output || ''}\n${result.command}\n${result.output}\nExit code: ${result.code}`;
  $('#output').textContent = (result.tests?.code === 0 ? 'Functional tests: PASS\n\n' : '') +
    result.output.split('\n').filter(line => /Aram|policy|denied|passed|candidate|stash|success|no-weather|Error:|contract|Enterprise/i.test(line)).join('\n') +
    `\n\nNool exit code: ${result.code}`;
  if (result.verdict === 'unavailable') return unavailable(result);
  if (result.verdict === 'blocked') {
    $('#title').textContent = 'Nool rejected the change.';
    $('#explain').textContent = 'The weather tests passed, but the configured key rule rejected this proposal.';
    $('#callout').textContent = 'The proposal did not advance. Git HEAD is unchanged. Fix the code and check again.';
    $('#next').textContent = phase === 3 ? 'Show the correction →' : 'Replay the story';
    $('#next').disabled = phase !== 3;
  } else if (result.verdict === 'accepted') {
    $('#title').textContent = 'The corrected proposal passed.';
    $('#explain').textContent = 'The same rule accepts the version that reads its key from the server environment.';
    $('#callout').textContent = 'Mistake → policy rejection → correction → accepted proposal. Further review and release checks still apply.';
    $('#next').textContent = 'Replay the story'; $('#next').disabled = false;
  } else {
    $('#title').textContent = 'Check did not give the expected result.';
    $('#explain').textContent = 'Read the actual Nool output below. This version of the demo will not label it a pass or policy block.';
    $('#next').disabled = true;
  }
}
function showMissingResult(kind) {
  phase = kind === 'unsafe' ? 3 : 5;
  render();
  document.body.dataset.verdict = '';
  const label = kind === 'unsafe' ? 'first' : 'corrected';
  $('#title').textContent = `The ${label} Nool check has not been recorded.`;
  $('#explain').textContent = 'This replay shows the story without inventing a policy result. Run the guided check to capture actual CLI output.';
  $('#callout').textContent = 'No pass or block is being claimed here.';
  $('#badge').textContent = 'NOT RUN';
  $('#command').textContent = '$ Run the guided check to capture actual Nool output';
  $('#output').textContent = 'No saved result for this step.';
  $('#raw').textContent = 'No terminal output was recorded for this check. The loop only replays saved results and does not run Nool commands. Click through the story and run the check to capture the actual CLI output.';
  $('#next').disabled = true;
}
async function check(kind) {
  pending = true; $('#next').disabled = true; $('#reset').disabled = true;
  $('#command').textContent = `$ ${kind === 'unsafe' ? 'nool propose --path src/weather.js --intent "Add weather lookup"' : 'nool propose --path src/weather.js --intent "Read weather key from server environment"'}`;
  $('#output').textContent = 'Running tests and the real Nool proposal…';
  $('#raw').textContent = 'Running functional tests and the real Nool proposal. Full output will appear here when the command finishes…';
  try {
    const result = await request(`/api/${kind}`);
    savedResults[kind] = result;
    showRecordedResult(kind, result);
    const hasBoth = savedResults.unsafe && savedResults.fixed;
    $('#loop-note').textContent = hasBoth ? 'Replays saved command results; loops never rerun Nool.' : 'Loops the story; missing check results are labeled “Not run”.';
  } catch (error) {
    $('#title').textContent = 'Check could not complete.'; $('#callout').textContent = error.message;
    $('#raw').textContent = `Check could not complete:\n${error.stack || error.message}`;
    lastVerdict = 'error'; $('#badge').textContent = 'ERROR';
  } finally { pending = false; $('#reset').disabled = false; }
}
$('#next').addEventListener('click', async () => {
  if (pending) return;
  if (phase >= 5) { phase = 0; render(); return; }
  phase++; render();
  if (phase === 3) savedResults.unsafe ? showRecordedResult('unsafe', savedResults.unsafe) : await check('unsafe');
  if (phase === 5) savedResults.fixed ? showRecordedResult('fixed', savedResults.fixed) : await check('fixed');
});
$('#reset').addEventListener('click', async () => {
  if (pending) return;
  clearTimeout(loopTimer); $('#play-loop').textContent = 'Play loop ∞'; $('#pause-loop').hidden = true; looping = false;
  try {
    await request('/api/reset'); phase = 0; lastVerdict = null; document.body.dataset.verdict = '';
    savedResults = {}; $('#play-loop').disabled = false; $('#loop-note').textContent = 'Loops the story; missing check results are labeled “Not run”.';
    $('#next').disabled = false; $('#raw').textContent = 'No terminal output yet. Click through the story and run a Nool check to capture the CLI output here. The automatic loop only replays saved results; it does not run commands.'; render();
  } catch (error) { $('#callout').textContent = error.message; }
});
$('#city').addEventListener('change', async () => {
  try {
    const response = await fetch('/api/weather?city=' + encodeURIComponent($('#city').value));
    const weather = await response.json(); if (!response.ok) throw new Error(weather.error);
    $('#city-name').textContent = weather.city; $('#weather-result').textContent = `${weather.temperature}° · ${weather.condition}`;
  } catch (error) { $('#weather-result').textContent = error.message; }
});
let looping = false;
async function playLoop() {
  if (!looping) return;
  if (phase >= 5) { phase = 0; }
  else phase++;
  render();
  if (phase === 3) savedResults.unsafe ? showRecordedResult('unsafe', savedResults.unsafe) : showMissingResult('unsafe');
  if (phase === 5) savedResults.fixed ? showRecordedResult('fixed', savedResults.fixed) : showMissingResult('fixed');
  loopTimer = setTimeout(playLoop, phase === 3 || phase === 5 ? 5500 : 3500);
}
function startLoop() {
  looping = true; $('#play-loop').hidden = true; $('#pause-loop').hidden = false; phase = 0; render();
  loopTimer = setTimeout(playLoop, 3500);
}
$('#play-loop').addEventListener('click', startLoop);
$('#pause-loop').addEventListener('click', () => {
  looping = false; clearTimeout(loopTimer); $('#play-loop').hidden = false; $('#pause-loop').hidden = true;
});
try {
  const [sourceResponse, resultsResponse] = await Promise.all([fetch('/api/source'), fetch('/api/results')]);
  if (!sourceResponse.ok) throw new Error('Could not load the demo source.');
  sources = await sourceResponse.json();
  if (resultsResponse.ok) {
    const saved = await resultsResponse.json();
    savedResults = { ...(saved.unsafe ? { unsafe: saved.unsafe } : {}), ...(saved.fixed ? { fixed: saved.fixed } : {}) };
    $('#loop-note').textContent = savedResults.unsafe && savedResults.fixed
      ? 'Replays saved command results; loops never rerun Nool.'
      : 'Loops the story; missing check results are labeled “Not run”.';
  }
  render();
  if (new URLSearchParams(location.search).get('play') === 'loop') startLoop();
}
catch (error) { $('#callout').textContent = error.message; $('#next').disabled = true; }
