// CS Club CTF: scoreboard, tabs, hints and the toolbox.
// (No flags are stored in plain text in this file. We checked.)

var HASHES = {"1": "299574dd65753a57", "2": "6becc3c221d15016", "3": "5e769d6970b25547", "4": "3ad368e426fb7c70", "5": "d7061cf4d429b27c", "6": "42102b498bae7ac5", "7": "1c53f448fd30543c", "8": "7794f5059b9510c5", "9": "c425a497b8b8ed1b"};
var POINTS = {"1": 50, "2": 75, "3": 100, "4": 100, "5": 100, "6": 150, "7": 150, "8": 150, "9": 300};
var HINT_COST = 25;
var HINTS = {
  1: "Right-click this page and choose View Page Source (or press Ctrl+U). Read the code near challenge 1.",
  2: "Try selecting everything in the box with your mouse, or press Ctrl+A.",
  3: "Letters, numbers and sometimes = at the end? That's Base64. Use the toolbox at the bottom of this page.",
  4: "It's binary. Each group of 8 is one character. Use the toolbox at the bottom of this page.",
  5: "Shift every letter back by 3. The toolbox slider does it for you.",
  6: "There are only 25 possible shifts. Try them all and look for the one you can read.",
  7: "Log in as guest, then look very carefully at the address bar.",
  8: "View this page's source and find the function called checkPassword. What is it comparing your guess to?",
  9: "View this page's source and find the comment near the vault. Decode it once, then again a different way."
};
var ROUNDS = [
  { file: "round1.html", label: "Round 1", name: "Look under the hood", color: "#ff7700", ch: [1, 2] },
  { file: "round2.html", label: "Round 2", name: "Secret codes that aren't secret", color: "#0088ff", ch: [3, 4] },
  { file: "round3.html", label: "Round 3", name: "Crack the cipher", color: "#c77dff", ch: [5, 6] },
  { file: "round4.html", label: "Round 4", name: "Never trust the browser", color: "#00e676", ch: [7, 8] },
  { file: "boss.html", label: "Final Boss", name: "The Vault", color: "#ff3b5c", ch: [9] }
];
var HERE = location.pathname.split("/").pop() || "index.html";

function fingerprint(text) {
  var a = 2166136261, b = 5381;
  for (var i = 0; i < text.length; i++) {
    var c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619) >>> 0;
    b = (Math.imul(b, 33) ^ c) >>> 0;
  }
  return ("0000000" + a.toString(16)).slice(-8) + ("0000000" + b.toString(16)).slice(-8);
}

function unlock(hex, key) {
  var out = "";
  for (var i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.substr(i, 2), 16) ^ key.charCodeAt((i / 2) % key.length));
  }
  return out;
}

var state = { team: "", solved: {}, hints: {} };
try { state = JSON.parse(localStorage.getItem("ctf-state")) || state; } catch (e) {}
function saveState() { try { localStorage.setItem("ctf-state", JSON.stringify(state)); } catch (e) {} }

function roundProgress(r) {
  var done = 0, pts = 0;
  r.ch.forEach(function (n) { if (state.solved[n]) done++; pts += POINTS[n]; });
  return { done: done, total: r.ch.length, points: pts };
}

// ---- top bar and tabs, the same on every page ----
function buildTop() {
  var top = document.getElementById("top");
  if (!top) return;
  var tabs = '<a class="tab' + (HERE === "index.html" ? " active" : "") + '" href="index.html">Home</a>';
  ROUNDS.forEach(function (r, i) {
    tabs += '<a class="tab' + (HERE === r.file ? " active" : "") + '" id="tab' + i + '" style="--c:' + r.color + '" href="' + r.file + '">' +
      r.label + ' <span class="count"></span></a>';
  });
  top.innerHTML =
    '<header><div><a class="brand" href="index.html">🚩 CS Club CTF</a>' +
    '<p class="sub">Find the flags. Every flag looks like <code>flag{something_like_this}</code></p></div>' +
    '<div id="scorebox"><input id="team" placeholder="Team name" maxlength="24"><div id="score">0</div><div id="solvedCount">0 / 9 solved</div></div></header>' +
    '<nav class="tabs">' + tabs + '</nav>';
  var team = document.getElementById("team");
  team.value = state.team || "";
  team.oninput = function () { state.team = team.value; saveState(); };
}

// ---- answer boxes for whichever challenges are on this page ----
function buildAnswers() {
  for (var n = 1; n <= 9; n++) (function (n) {
    var box = document.querySelector("#c" + n + " .answer");
    if (!box) return;
    box.innerHTML = '<input placeholder="flag{...}" autocomplete="off"><button class="btn">Submit</button>' +
      '<button class="btn hint">Hint (-' + HINT_COST + ')</button><div class="hinttext"></div><div class="feedback"></div>';
    var input = box.querySelector("input"), fb = box.querySelector(".feedback");
    function submit() {
      var guess = input.value.trim().toLowerCase();
      if (fingerprint(guess) === HASHES[n]) {
        state.solved[n] = true; saveState(); render();
        fb.className = "feedback good"; fb.innerText = "Correct! +" + POINTS[n] + " points";
      } else {
        fb.className = "feedback bad";
        fb.innerText = guess.indexOf("flag{") === 0 ? "Not the right flag." : "Flags look like flag{...}";
      }
    }
    box.querySelectorAll("button")[0].onclick = submit;
    input.onkeydown = function (e) { if (e.key === "Enter") submit(); };
    box.querySelector(".hint").onclick = function () {
      if (state.hints[n] || confirm("Take a hint for " + HINT_COST + " points?")) {
        state.hints[n] = true; saveState(); render();
      }
    };
    if (state.solved[n]) { fb.className = "feedback good"; fb.innerText = "Solved!"; }
  })(n);
}

function render() {
  var score = 0, solved = 0;
  for (var n = 1; n <= 9; n++) {
    if (state.solved[n]) { score += POINTS[n]; solved++; }
    if (state.hints[n]) score -= HINT_COST;
    var card = document.getElementById("c" + n);
    if (!card) continue;
    card.classList.toggle("solved", !!state.solved[n]);
    if (state.hints[n]) card.querySelector(".hinttext").innerText = "Hint: " + HINTS[n];
  }
  if (document.getElementById("score")) {
    document.getElementById("score").innerText = score;
    document.getElementById("solvedCount").innerText = solved + " / 9 solved";
  }
  ROUNDS.forEach(function (r, i) {
    var p = roundProgress(r), tab = document.getElementById("tab" + i), card = document.getElementById("round" + i);
    if (tab) { tab.querySelector(".count").innerText = p.done === p.total ? "✓" : p.done + "/" + p.total; tab.classList.toggle("done", p.done === p.total); }
    if (card) { card.querySelector(".progress").innerText = p.done === p.total ? "✓ Done" : p.done + " of " + p.total + " solved"; card.classList.toggle("done", p.done === p.total); }
  });
}

// ---- previous / next round buttons ----
function buildPager() {
  var el = document.getElementById("pager");
  if (!el) return;
  var i = ROUNDS.map(function (r) { return r.file; }).indexOf(HERE), html = "";
  html += i > 0 ? '<a class="btn ghost" href="' + ROUNDS[i - 1].file + '">← ' + ROUNDS[i - 1].label + '</a>' : '<a class="btn ghost" href="index.html">← Home</a>';
  html += i < ROUNDS.length - 1 ? '<a class="btn next" href="' + ROUNDS[i + 1].file + '">' + ROUNDS[i + 1].label + ' →</a>' : '<a class="btn next" href="index.html">See your score →</a>';
  el.className = "pager"; el.innerHTML = html;
}

// ---- Challenge 7: the page decides who you are by reading the address bar ----
function staffRoom() {
  var room = document.getElementById("staffroom");
  if (!room) return;
  var role = new URLSearchParams(location.search).get("role");
  if (!role) return;
  role = role.trim().toLowerCase();
  if (role === "guest") room.innerText = "Welcome, guest. Staff room: ACCESS DENIED 🚫";
  else if (fingerprint(unlock("07080c0e150f011b0c1c3e101f1c1d153b19010b3e111f0513", role)) === HASHES[7]) room.innerText = "Welcome, " + role + ". Staff room open: " + unlock("07080c0e150f011b0c1c3e101f1c1d153b19010b3e111f0513", role);
  else room.innerText = "Unknown role: " + role;
}

// ---- Challenge 9 ----
function openVault() {
  var code = document.getElementById("vaultInput").value.trim();
  var out = document.getElementById("vaultOut");
  var flag = code ? unlock("091c0409240a0a063e0c173a6b5c00073a0f001b04100a081722", code) : "";
  if (fingerprint(flag) === HASHES[9]) out.innerText = "🔓 Vault open: " + flag;
  else out.innerText = "🔒 Wrong code.";
}

// ---- Toolbox ----
function buildToolbox() {
  var el = document.getElementById("toolbox");
  if (!el) return;
  el.innerHTML =
    '<h2 class="round tools">🧰 Hacker Toolbox</h2><section class="card toolbox">' +
    '<p>Paste scrambled text here, then pick a tool.</p><textarea id="toolIn" placeholder="Paste text here"></textarea>' +
    '<div><button class="btn" onclick="tool(\'b64\')">Decode Base64</button><button class="btn" onclick="tool(\'bin\')">Binary to text</button>' +
    '<button class="btn" onclick="tool(\'all\')">Try all 25 Caesar shifts</button></div>' +
    '<div class="shiftrow">Caesar shift back by <b id="shiftNum">3</b> <input type="range" id="shift" min="1" max="25" value="3" oninput="tool(\'caesar\')"></div>' +
    '<pre id="toolOut" class="blob">Output shows up here.</pre></section>';
}
function caesar(text, back) {
  return text.replace(/[a-z]/gi, function (ch) {
    var base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode((ch.charCodeAt(0) - base - back + 26 * 2) % 26 + base);
  });
}
function tool(kind) {
  var text = document.getElementById("toolIn").value.trim();
  var out = document.getElementById("toolOut");
  var shift = document.getElementById("shift").value;
  document.getElementById("shiftNum").innerText = shift;
  if (!text) { out.innerText = "Paste something in the box first."; return; }
  try {
    if (kind === "b64") out.innerText = atob(text);
    if (kind === "bin") out.innerText = text.split(/\s+/).map(function (b) { return String.fromCharCode(parseInt(b, 2)); }).join("");
    if (kind === "caesar") out.innerText = caesar(text, Number(shift));
    if (kind === "all") {
      var lines = [];
      for (var s = 1; s <= 25; s++) lines.push((s < 10 ? " " : "") + s + ":  " + caesar(text, s));
      out.innerText = lines.join("\n");
    }
  } catch (e) {
    out.innerText = "That doesn't look like the right kind of text for this tool.";
  }
}

function resetAll() {
  if (confirm("Erase your score and start over?")) {
    state = { team: "", solved: {}, hints: {} }; saveState(); location.href = "index.html";
  }
}

buildTop(); buildAnswers(); buildToolbox(); buildPager(); render(); staffRoom();
