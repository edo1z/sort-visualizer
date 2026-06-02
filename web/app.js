// Watch mode (15 built-in sorts) + Code mode (write your own sort, visualize & score it).
// User code runs in a Web Worker (separate thread): infinite loops don't freeze the page and
// can be force-stopped via a watchdog. Falls back to a sandboxed iframe where Workers are blocked.
(function () {
  const $ = (id) => document.getElementById(id);
  const cv = $("cv"), ctx = cv.getContext("2d");
  const algoEl = $("algo"), speedEl = $("speed"), sizeEl = $("size");

  let mode = "observe";
  let state = null;
  let playing = false;
  let acc = 0, lastT = 0;
  let editor = null;
  let pristine = true;   // is the editor still showing an unedited template?

  function rangeArr(lo, hi) { const r = []; for (let i = lo; i < hi; i++) r.push(i); return r; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function buildArray(size) {
    const arr = Array.from({ length: size }, (_, i) => i + 1);
    for (let i = size - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }

  // ---- rendering (neon: cyan->magenta value gradient, white glowing head, green when sorted)
  function draw() {
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const a = state.arr, n = a.length;
    if (!n) return;
    const bw = W / n, mx = Math.max.apply(null, a) || 1;
    const gap = bw > 6 ? Math.max(1, bw * 0.14) : 0;
    for (let i = 0; i < n; i++) {
      const v = a[i];
      const bh = v / mx * (H - 18);
      const x = i * bw, y = H - bh, w = Math.max(1, bw - gap);
      const hue = 188 + (v / mx) * 132;        // 188 cyan -> 320 magenta/pink
      if (state.active.has(i)) {
        ctx.shadowColor = "#ff2d95"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffffff";
      } else if (state.done.has(i)) {
        ctx.shadowColor = "rgba(57,255,20,0.45)"; ctx.shadowBlur = 5; ctx.fillStyle = "#39ff14";
      } else {
        ctx.shadowBlur = 0; ctx.fillStyle = `hsl(${hue}, 85%, 56%)`;
      }
      ctx.fillRect(x, y, w, bh);
    }
    ctx.shadowBlur = 0;
  }
  function resizeCanvas() { cv.width = Math.max(320, cv.parentElement.clientWidth); cv.height = 420; if (state) draw(); }
  function updateCounters() { $("cmpCount").textContent = state.cmp.toLocaleString(); $("swapCount").textContent = state.swap.toLocaleString(); }
  function setStatus(s) { $("status").textContent = s; }
  function updatePlayBtn() { $("playBtn").textContent = playing ? "⏸ Pause" : "▶ Play"; }

  function stepOnce() {
    if (state.finished) return false;
    const r = state.gen.next();
    if (r.done) { state.finished = true; setStatus("✅ Done"); return false; }
    const v = r.value;
    if (v.arr) state.arr = v.arr;
    const terminal = v.done && state.arr.length > 0 && v.done.length === state.arr.length;
    if (!terminal) { if (v.type === "cmp") state.cmp++; else state.swap++; }
    state.active = new Set(v.active);
    state.done = new Set(v.done);
    return true;
  }
  function tick(t) {
    if (lastT) {
      const dt = (t - lastT) / 1000;
      if (playing && state && !state.finished) {
        acc += dt * (+speedEl.value);
        let budget = 0;
        while (acc >= 1 && !state.finished && budget < 5000) { acc -= 1; stepOnce(); budget++; }
        draw(); updateCounters();
        if (state.finished) { playing = false; updatePlayBtn(); }
      }
    }
    lastT = t;
    requestAnimationFrame(tick);
  }
  function framesIterator(frames) { let i = 0; return { next: () => i < frames.length ? { value: frames[i++], done: false } : { done: true } }; }

  // ========================================================= Watch mode
  function resetObserve() {
    const key = algoEl.value;
    const arr = buildArray(+sizeEl.value);
    state = { arr, gen: SORTS[key](arr), finished: false, cmp: 0, swap: 0, active: new Set(), done: new Set() };
    acc = 0; resizeCanvas(); updateInfo(key); updateCounters(); draw(); setStatus("Ready");
  }
  function yn(b) { return b ? "✅" : "❌"; }
  function updateInfo(key) {
    const m = META[key];
    $("info").innerHTML =
      `<h2>${m.name}</h2><p class="cat">${m.category}</p><p>${m.desc}</p>` +
      (m.note ? `<p class="note">${m.note}</p>` : "") +
      `<table>
         <tr><td>Best</td><td><code>${m.best}</code></td><td>Avg</td><td><code>${m.avg}</code></td></tr>
         <tr><td>Worst</td><td><code>${m.worst}</code></td><td>Memory</td><td><code>${m.space}</code></td></tr>
         <tr><td>Stable</td><td>${yn(m.stable)}</td><td>In-place</td><td>${yn(m.inPlace)}</td></tr>
       </table>` +
      `<p><b style="font-family:var(--font-head);font-size:.66rem;letter-spacing:1px;text-transform:uppercase;color:var(--neon-orange)">When to use</b> ${m.when}</p>` +
      `<div class="pc"><div><b>Pros</b><ul>${m.pros.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>` +
      `<div><b>Cons</b><ul>${m.cons.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div></div>`;
  }

  // ========================================================= Code mode
  const DEFAULT_CODE = `// Implement sort(a, viz). a is a number array.
// compare: viz.gt(i,j) / viz.lt(i,j)   swap: viz.swap(i,j)
// write: viz.set(i, v)   read: viz.get(i)   length: a.length
function sort(a, viz) {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - 1 - i; j++) {
      if (viz.gt(j, j + 1)) {   // a[j] > a[j+1] ?
        viz.swap(j, j + 1);
      }
    }
  }
}`;

  // ---- runner core (shared by Worker and iframe). Pure logic, no host I/O.
  const RUNNER_CORE = `
var OP_CAP=2000000, FRAME_CAP=120000;
function rangeArr(lo,hi){var r=[];for(var i=lo;i<hi;i++)r.push(i);return r;}
function buildArray(n){var a=Array.from({length:n},function(_,i){return i+1;});for(var i=n-1;i>0;i--){var j=(Math.random()*(i+1))|0;var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function isSorted(a){for(var i=0;i<a.length-1;i++)if(a[i]>a[i+1])return false;return true;}
function makeViz(a,record){var frames=[];var cmp=0,sw=0,ops=0;
function bump(){if(++ops>OP_CAP)throw new Error("too many operations (possible infinite loop)");}
function snap(active,type){if(record){if(frames.length>=FRAME_CAP)throw new Error("too many steps to visualize (capped at "+FRAME_CAP+")");frames.push({arr:a.slice(),active:active,done:[],type:type});}}
return{frames:frames,counts:function(){return{cmp:cmp,sw:sw};},get n(){return a.length;},
get:function(i){return a[i];},
gt:function(i,j){bump();cmp++;snap([i,j],"cmp");return a[i]>a[j];},
lt:function(i,j){bump();cmp++;snap([i,j],"cmp");return a[i]<a[j];},
ge:function(i,j){bump();cmp++;snap([i,j],"cmp");return a[i]>=a[j];},
le:function(i,j){bump();cmp++;snap([i,j],"cmp");return a[i]<=a[j];},
swap:function(i,j){bump();sw++;var t=a[i];a[i]=a[j];a[j]=t;snap([i,j],"swap");},
set:function(i,v){bump();sw++;a[i]=v;snap([i],"write");}};}
function compile(src){var fn=(new Function(src+"\\n;return sort;"))();if(typeof fn!=="function")throw new Error("sort(a, viz) function not found");return fn;}
function checkCorrectness(fn){var cases=[[],[1],[2,1],[5,3,8,1,9,2,7,4,6,0],[3,3,1,1,2,2],rangeArr(0,15),rangeArr(0,15).reverse()];
for(var t=0;t<12;t++){var n=(Math.random()*30)|0;cases.push(Array.from({length:n},function(){return (Math.random()*50)|0;}));}
for(var k=0;k<cases.length;k++){var data=cases[k];var a=data.slice();try{fn(a,makeViz(a,false));}catch(e){return{ok:false,msg:"runtime error: "+e.message};}if(!isSorted(a))return{ok:false,msg:"did not sort ["+data+"]"};}
return{ok:true,n:cases.length};}
function estimateComplexity(fn){var sizes=[100,200,400,800],ops=[];
for(var s=0;s<sizes.length;s++){var a=buildArray(sizes[s]);var v=makeViz(a,false);try{fn(a,v);}catch(e){return null;}var c=v.counts();ops.push(c.cmp+c.sw);}
var ratios=[];for(var i=0;i<ops.length-1;i++)if(ops[i]>0)ratios.push(ops[i+1]/ops[i]);if(!ratios.length)return null;
var avg=ratios.reduce(function(s,x){return s+x;},0)/ratios.length;var label;
if(avg<1.4)label="below O(n) (best case?)";else if(avg<2.2)label="~O(n)";else if(avg<2.8)label="~O(n log n)";else if(avg<3.4)label="~O(n^1.5)";else if(avg<5)label="~O(n^2)";else label="worse than O(n^2)";
return{avg:avg,label:label,ops:ops,sizes:sizes};}
function handleJob(d){var id=d&&d.id;try{
var fn=compile(d.code);var arr=buildArray(d.vizN);var initial=arr.slice();var viz=makeViz(arr,true);fn(arr,viz);
viz.frames.push({arr:arr.slice(),active:[],done:rangeArr(0,arr.length),type:"write"});
var counts=viz.counts();var correctness=checkCorrectness(fn);var cx=estimateComplexity(fn);
postBack({id:id,ok:true,initial:initial,frames:viz.frames,counts:counts,correctness:correctness,cx:cx,vizN:d.vizN});
}catch(err){postBack({id:id,ok:false,error:String(err&&err.message||err)});}}
`;
  const WORKER_SRC = RUNNER_CORE + "self.onmessage=function(e){handleJob(e.data);};function postBack(m){self.postMessage(m);}self.postMessage({ready:true});";
  const IFRAME_SRC = '<!doctype html><meta charset="utf-8"><body><scr' + 'ipt>' + RUNNER_CORE +
    "addEventListener('message',function(e){handleJob(e.data);});function postBack(m){parent.postMessage(m,'*');}parent.postMessage({ready:true},'*');" +
    '</scr' + 'ipt></body>';

  const runner = { mode: null, worker: null, iframe: null, ready: false, everReady: false };
  let workerDisabled = false, jobSeq = 0;
  const pending = {};
  let readyQueue = [];

  function onRunnerMsg(d) {
    if (!d) return;
    if (d.ready) { runner.ready = true; runner.everReady = true; const q = readyQueue; readyQueue = []; q.forEach((f) => f()); return; }
    if (d.id != null && pending[d.id]) { const p = pending[d.id]; delete pending[d.id]; clearTimeout(p.timer); p.resolve(d); }
  }
  function makeRunner() {
    runner.ready = false; runner.everReady = false;
    if (!workerDisabled) {
      try {
        const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "application/javascript" }));
        const w = new Worker(url);
        w.onmessage = (e) => onRunnerMsg(e.data);
        w.onerror = () => { if (!runner.everReady) { workerDisabled = true; try { w.terminate(); } catch (_) {} runner.worker = null; makeRunner(); } };
        runner.worker = w; runner.iframe = null; runner.mode = "worker";
        return;
      } catch (e) { workerDisabled = true; }
    }
    if (runner.iframe) runner.iframe.remove();
    const ifr = document.createElement("iframe");
    ifr.setAttribute("sandbox", "allow-scripts");
    ifr.style.display = "none";
    ifr.srcdoc = IFRAME_SRC;
    document.body.appendChild(ifr);
    runner.iframe = ifr; runner.worker = null; runner.mode = "iframe";
  }
  window.addEventListener("message", (e) => {
    if (runner.mode === "iframe" && runner.iframe && e.source === runner.iframe.contentWindow) onRunnerMsg(e.data);
  });
  function killRunner() {
    if (runner.worker) { try { runner.worker.terminate(); } catch (_) {} runner.worker = null; }
    if (runner.iframe) { try { runner.iframe.remove(); } catch (_) {} runner.iframe = null; }
    runner.ready = false;
  }
  function postJob(job) {
    return new Promise((resolve, reject) => {
      const send = () => {
        pending[job.id] = {
          resolve,
          timer: setTimeout(() => {
            delete pending[job.id];
            killRunner(); makeRunner();
            reject(new Error("Execution stopped (possible infinite loop / too heavy)"));
          }, 5000),
        };
        if (runner.mode === "worker") runner.worker.postMessage(job);
        else runner.iframe.contentWindow.postMessage(job, "*");
      };
      if (runner.ready) send(); else readyQueue.push(send);
    });
  }

  function runCode() {
    const src = editor ? editor.getValue() : $("code").value;
    const id = ++jobSeq;
    $("runStatus").textContent = "Running…";
    postJob({ id, code: src, vizN: +sizeEl.value })
      .then((d) => { if (id === jobSeq) handleResult(d); })
      .catch((err) => { $("runStatus").textContent = ""; $("eval").innerHTML = `<span class="ng">${escapeHtml(err.message)}</span>`; });
  }
  function handleResult(d) {
    if (!d.ok) { $("runStatus").textContent = ""; $("eval").innerHTML = `<span class="ng">Error: ${escapeHtml(d.error)}</span>`; return; }
    state = { arr: d.initial.slice(), gen: framesIterator(d.frames), finished: false, cmp: 0, swap: 0, active: new Set(), done: new Set() };
    acc = 0; resizeCanvas(); updateCounters(); draw();
    renderEval(d.correctness, d.counts, d.vizN, d.cx);
    $("runStatus").textContent = d.correctness.ok ? "✅ sorts correctly" : "❌ does not sort";
    playing = true; updatePlayBtn(); setStatus("Playing…");
  }
  function renderEval(correctness, counts, size, cx) {
    let html = correctness.ok
      ? `<div class="ok">✅ Correct — all ${correctness.n} test cases sorted</div>`
      : `<div class="ng">❌ Incorrect — ${escapeHtml(correctness.msg)}</div>`;
    html += `<div>🔢 Operations (n=${size}): cmp <code>${counts.cmp}</code> · swap/write <code>${counts.sw}</code></div>`;
    if (cx) {
      html += `<div>📈 Complexity: ops <code>×${cx.avg.toFixed(2)}</code> per size-doubling → <code>${escapeHtml(cx.label)}</code>`
        + `<span style="color:var(--text-dim)"> (measured: ${cx.sizes.map((s, i) => `n=${s}:${cx.ops[i]}`).join(" / ")})</span></div>`;
    } else {
      html += `<div style="color:var(--text-dim)">📈 Complexity: too heavy to measure (possibly worse than O(n²))</div>`;
    }
    $("eval").innerHTML = html;
  }
  function codeIdle() {
    const arr = buildArray(+sizeEl.value);
    state = { arr, gen: framesIterator([]), finished: true, cmp: 0, swap: 0, active: new Set(), done: new Set() };
    acc = 0; playing = false; updatePlayBtn(); resizeCanvas(); updateCounters(); draw();
    setStatus("Press ▶ Run & score");
    $("eval").innerHTML = ""; $("runStatus").textContent = "";
  }

  // ========================================================= mode switch
  function setMode(m) {
    mode = m; playing = false; updatePlayBtn();
    $("tabObserve").classList.toggle("on", m === "observe");
    $("tabCode").classList.toggle("on", m === "code");
    $("codePanel").classList.toggle("hidden", m === "observe");
    $("info").classList.toggle("hidden", m === "code");
    $("algoLabel").textContent = m === "code" ? "Template" : "Algorithm";
    if (m === "observe") resetObserve();
    else { initEditor(); if (pristine) loadTemplate(algoEl.value); codeIdle(); }
  }
  function initEditor() {
    if (editor) return;
    const ta = $("code");
    if (window.CodeMirror) {
      editor = CodeMirror.fromTextArea(ta, { mode: "javascript", theme: "material-darker", lineNumbers: true, indentUnit: 2, tabSize: 2, autoCloseBrackets: true, matchBrackets: true });
      editor.setSize(null, 300);
      editor.on("change", () => { pristine = false; });
    }
    loadTemplate(algoEl.value);
  }
  function loadTemplate(key) {
    const code = (typeof TEMPLATES !== "undefined" && TEMPLATES[key]) || DEFAULT_CODE;
    if (editor) editor.setValue(code); else $("code").value = code;
    if (key === "bogo" && +sizeEl.value > 8) { sizeEl.value = 6; $("sizeVal").textContent = "6"; }
    pristine = true;
  }

  // ========================================================= wiring
  $("playBtn").onclick = () => {
    if (state && state.finished) { mode === "observe" ? resetObserve() : runCode(); }
    playing = !playing; updatePlayBtn(); setStatus(playing ? "Playing…" : "Paused");
  };
  $("stepBtn").onclick = () => { playing = false; updatePlayBtn(); stepOnce(); draw(); updateCounters(); };
  $("shuffleBtn").onclick = () => { playing = false; updatePlayBtn(); mode === "observe" ? resetObserve() : runCode(); };
  $("runBtn").onclick = () => runCode();
  $("tabObserve").onclick = () => setMode("observe");
  $("tabCode").onclick = () => setMode("code");
  algoEl.onchange = () => {
    playing = false; updatePlayBtn();
    if (mode === "observe") resetObserve();
    else { loadTemplate(algoEl.value); codeIdle(); }
  };
  sizeEl.oninput = () => { $("sizeVal").textContent = sizeEl.value; };
  sizeEl.onchange = () => { playing = false; updatePlayBtn(); mode === "observe" ? resetObserve() : codeIdle(); };
  speedEl.oninput = () => { $("speedVal").textContent = speedEl.value + " ops/s"; };
  window.addEventListener("resize", resizeCanvas);

  // ---- init
  ORDER.forEach((key) => { const opt = document.createElement("option"); opt.value = key; opt.textContent = META[key].name; algoEl.appendChild(opt); });
  $("sizeVal").textContent = sizeEl.value;
  $("speedVal").textContent = speedEl.value + " ops/s";
  makeRunner();
  resetObserve();
  requestAnimationFrame(tick);
})();
