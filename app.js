   1 | // ===================== DATA MODEL =====================
   2 | const DEFAULT_YEAR = 2026;
   3 | const STORAGE_KEY = 'oguta_fees_v1';
   4 | 
   5 | const DEFAULT_CHILDREN = [
   6 |   {
   7 |     id: 'derek',
   8 |     name: 'Derek Oguta',
   9 |     school: "St. Joseph's Rapogi School",
  10 |     class: 'Secondary',
  11 |     fees: {
  12 |       2026: { yearly: 61054, term1: 28777, term2: 18066, term3: 12011 }
  13 |     }
  14 |   },
  15 |   {
  16 |     id: 'brian',
  17 |     name: 'Brian Oguta Jr.',
  18 |     school: 'Christian Outreach Academy',
  19 |     class: 'Grade 3',
  20 |     fees: {
  21 |       2026: { yearly: 33000, term1: 11000, term2: 11000, term3: 11000 }
  22 |     }
  23 |   },
  24 |   {
  25 |     id: 'joseph',
  26 |     name: 'Joseph Oguta',
  27 |     school: 'Christian Outreach Academy',
  28 |     class: 'Playgroup',
  29 |     fees: {
  30 |       2026: { yearly: 27000, term1: 9000, term2: 9000, term3: 9000 }
  31 |     }
  32 |   }
  33 | ];
  34 | 
  35 | // Term calendar (approximate for 2026)
  36 | const TERM_DATES = {
  37 |   1: { start: '2026-01-06', end: '2026-03-15', months: [1,2,3], dueDays: [7,7,7] },
  38 |   2: { start: '2026-05-15', end: '2026-07-15', months: [5,6,7], dueDays: [7,7,7] },
  39 |   3: { start: '2026-08-15', end: '2026-10-15', months: [8,9,10], dueDays: [7,7,7] }
  40 | };
  41 | 
  42 | let state = {
  43 |   year: DEFAULT_YEAR,
  44 |   children: [],
  45 |   payments: [], // { id, childId, amount, date, method, ref, allocate, notes, receiptBase64, createdAt }
  46 |   arrears: {}   // { childId: { [year]: amount } }
  47 | };
  48 | 
  49 | // Tracking state for editing existing records
  50 | let editingPaymentId = null;
  51 | 
  52 | // ===================== UTILITIES =====================
  53 | function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  54 | function formatKES(n) {
  55 |   return 'KES ' + Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });
  56 | }
  57 | function todayISO() {
  58 |   const d = new Date();
  59 |   return d.toISOString().slice(0,10);
  60 | }
  61 | function parseDate(s) { return new Date(s + 'T00:00:00'); }
  62 | function daysBetween(d1, d2) {
  63 |   return Math.floor((parseDate(d2) - parseDate(d1)) / 86400000);
  64 | }
  65 | 
  66 | function getCurrentTerm(year = state.year) {
  67 |   const today = new Date();
  68 |   const y = today.getFullYear();
  69 |   if (y < year) return 1;
  70 |   if (y > year) return 3;
  71 |   const m = today.getMonth() + 1;
  72 |   if (m <= 3) return 1;
  73 |   if (m <= 7) return 2;
  74 |   return 3;
  75 | }
  76 | 
  77 | function getTermDueDate(year, term, instalment = 1) {
  78 |   const td = TERM_DATES[term];
  79 |   if (!td) return null;
  80 |   const month = td.months[instalment - 1];
  81 |   const day = td.dueDays[instalment - 1] || 7;
  82 |   return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  83 | }
  84 | 
  85 | // ===================== PERSISTENCE =====================
  86 | function loadState() {
  87 |   try {
  88 |     const raw = localStorage.getItem(STORAGE_KEY);
  89 |     if (raw) {
  90 |       state = JSON.parse(raw);
  91 |       if (!state.children || state.children.length === 0) {
  92 |         state.children = JSON.parse(JSON.stringify(DEFAULT_CHILDREN));
  93 |       }
  94 |       if (!state.payments) state.payments = [];
  95 |       if (!state.arrears) state.arrears = {};
  96 |       if (!state.year) state.year = DEFAULT_YEAR;
  97 |     } else {
  98 |       state.children = JSON.parse(JSON.stringify(DEFAULT_CHILDREN));
  99 |       state.payments = [];
 100 |       state.arrears = {};
 101 |       state.year = DEFAULT_YEAR;
 102 |       saveState();
 103 |     }
 104 |   } catch (e) {
 105 |     console.error(e);
 106 |     state.children = JSON.parse(JSON.stringify(DEFAULT_CHILDREN));
 107 |     state.payments = [];
 108 |     state.arrears = {};
 109 |     state.year = DEFAULT_YEAR;
 110 |   }
 111 | }
 112 | 
 113 | function saveState() {
 114 |   localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
 115 | }
 116 | 
 117 | // ===================== CALCULATIONS =====================
 118 | function getChildFees(childId, year) {
 119 |   const child = state.children.find(c => c.id === childId);
 120 |   if (!child) return { yearly:0, term1:0, term2:0, term3:0 };
 121 |   return child.fees[year] || { yearly:0, term1:0, term2:0, term3:0 };
 122 | }
 123 | 
 124 | function getArrears(childId, year) {
 125 |   return (state.arrears[childId] && state.arrears[childId][year]) || 0;
 126 | }
 127 | 
 128 | function getPaymentsFor(childId, year, term = null) {
 129 |   return state.payments.filter(p => {
 130 |     if (p.childId !== childId) return false;
 131 |     const py = parseInt(p.date.slice(0,4), 10);
 132 |     if (py !== year && p.allocate !== 'arrears') return false;
 133 |     if (term === null) return true;
 134 |     if (p.allocate === 'arrears') return false;
 135 |     if (p.allocate === 'current') {
 136 |       return getCurrentTerm(year) === term;
 137 |     }
 138 |     return p.allocate === `term${term}`;
 139 |   });
 140 | }
 141 | 
 142 | function sumPayments(payments) {
 143 |   return payments.reduce((s, p) => s + Number(p.amount || 0), 0);
 144 | }
 145 | 
 146 | function getChildSummary(childId, year) {
 147 |   const fees = getChildFees(childId, year);
 148 |   const arrears = getArrears(childId, year);
 149 |   const allPays = state.payments.filter(p => p.childId === childId && (parseInt(p.date.slice(0,4)) === year || p.allocate === 'arrears'));
 150 |   const paidTotal = sumPayments(allPays);
 151 | 
 152 |   let arrearsCleared = 0;
 153 |   const termCleared = [0, 0, 0];
 154 |   const currentTerm = getCurrentTerm(year);
 155 | 
 156 |   allPays.forEach(p => {
 157 |     const amt = Number(p.amount || 0);
 158 |     if (p.allocate === 'arrears') {
 159 |       arrearsCleared += amt;
 160 |     } else if (p.allocate === 'current') {
 161 |       termCleared[currentTerm - 1] += amt;
 162 |     } else if (p.allocate === 'term1') {
 163 |       termCleared[0] += amt;
 164 |     } else if (p.allocate === 'term2') {
 165 |       termCleared[1] += amt;
 166 |     } else if (p.allocate === 'term3') {
 167 |       termCleared[2] += amt;
 168 |     } else {
 169 |       termCleared[currentTerm - 1] += amt;
 170 |     }
 171 |   });
 172 | 
 173 |   arrearsCleared = Math.min(arrears, arrearsCleared);
 174 |   termCleared[0] = Math.min(fees.term1, termCleared[0]);
 175 |   termCleared[1] = Math.min(fees.term2, termCleared[1]);
 176 |   termCleared[2] = Math.min(fees.term3, termCleared[2]);
 177 | 
 178 |   const totalDue = arrears + fees.yearly;
 179 |   const balance = Math.max(0, totalDue - paidTotal);
 180 |   const pct = totalDue > 0 ? Math.min(100, Math.round((paidTotal / totalDue) * 100)) : 100;
 181 | 
 182 |   return {
 183 |     fees, arrears, paidTotal, balance, pct,
 184 |     termDue: [fees.term1, fees.term2, fees.term3],
 185 |     termPaid: termCleared,
 186 |     arrearsCleared
 187 |   };
 188 | }
 189 | 
 190 | function getOverdueInfo(childId, year) {
 191 |   const currentTerm = getCurrentTerm(year);
 192 |   const fees = getChildFees(childId, year);
 193 |   const summary = getChildSummary(childId, year);
 194 |   const today = todayISO();
 195 |   let oldestOverdueDays = 0;
 196 |   let overdueAmount = 0;
 197 | 
 198 |   for (let t = 1; t <= currentTerm; t++) {
 199 |     const termDue = [fees.term1, fees.term2, fees.term3][t-1];
 200 |     const instalment = termDue / 3;
 201 |     for (let i = 1; i <= 3; i++) {
 202 |       const dueDate = getTermDueDate(year, t, i);
 203 |       if (!dueDate || dueDate > today) continue;
 204 |       const paidForTerm = summary.termPaid[t-1];
 205 |       const expectedByNow = instalment * i;
 206 |       if (paidForTerm < expectedByNow - 1) {
 207 |         const days = daysBetween(dueDate, today);
 208 |         if (days > oldestOverdueDays) oldestOverdueDays = days;
 209 |         overdueAmount += Math.max(0, expectedByNow - paidForTerm);
 210 |       }
 211 |     }
 212 |   }
 213 |   if (summary.arrears > summary.arrearsCleared) {
 214 |     oldestOverdueDays = Math.max(oldestOverdueDays, 60);
 215 |     overdueAmount += (summary.arrears - summary.arrearsCleared);
 216 |   }
 217 | 
 218 |   let ageing = 'Current';
 219 |   if (oldestOverdueDays > 60) ageing = '61+ days';
 220 |   else if (oldestOverdueDays > 30) ageing = '31–60 days';
 221 |   else if (oldestOverdueDays > 0) ageing = '0–30 days';
 222 | 
 223 |   return { oldestOverdueDays, overdueAmount, ageing };
 224 | }
 225 | 
 226 | // ===================== RENDER =====================
 227 | function renderAll() {
 228 |   document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-KE', {
 229 |     weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
 230 |   });
 231 |   const ct = getCurrentTerm();
 232 |   document.getElementById('currentTermLabel').textContent = `Term ${ct} ${state.year}`;
 233 | 
 234 |   const ys = document.getElementById('yearSelect');
 235 |   ys.innerHTML = '';
 236 |   for (let y = state.year - 2; y <= state.year + 2; y++) {
 237 |     const opt = document.createElement('option');
 238 |     opt.value = y;
 239 |     opt.textContent = y;
 240 |     if (y === state.year) opt.selected = true;
 241 |     ys.appendChild(opt);
 242 |   }
 243 | 
 244 |   renderFamilySummary();
 245 |   renderChildCards();
 246 |   renderDetailTabs();
 247 |   populatePaymentForm();
 248 | }
 249 | 
 250 | function renderFamilySummary() {
 251 |   let totalDue = 0, totalPaid = 0, totalBalance = 0, totalArrears = 0;
 252 |   state.children.forEach(c => {
 253 |     const s = getChildSummary(c.id, state.year);
 254 |     totalDue += s.fees.yearly + s.arrears;
 255 |     totalPaid += s.paidTotal;
 256 |     totalBalance += s.balance;
 257 |     totalArrears += Math.max(0, s.arrears - s.arrearsCleared);
 258 |   });
 259 |   const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;
 260 | 
 261 |   document.getElementById('familySummary').innerHTML = `
 262 |     <div class="summary-card">
 263 |       <h3>Family Total Due (${state.year})</h3>
 264 |       <div class="value">${formatKES(totalDue)}</div>
 265 |       <div class="sub">Including arrears</div>
 266 |     </div>
 267 |     <div class="summary-card success">
 268 |       <h3>Total Paid</h3>
 269 |       <div class="value">${formatKES(totalPaid)}</div>
 270 |       <div class="sub">${pct}% of annual obligation</div>
 271 |     </div>
 272 |     <div class="summary-card ${totalBalance > 0 ? 'danger' : 'success'}">
 273 |       <h3>Outstanding Balance</h3>
 274 |       <div class="value">${formatKES(totalBalance)}</div>
 275 |       <div class="sub">${totalBalance === 0 ? 'All clear' : 'Across all children'}</div>
 276 |     </div>
 277 |     <div class="summary-card warning">
 278 |       <h3>Open Arrears</h3>
 279 |       <div class="value">${formatKES(totalArrears)}</div>
 280 |       <div class="sub">Carried forward</div>
 281 |     </div>
 282 |   `;
 283 | }
 284 | 
 285 | function renderChildCards() {
 286 |   const container = document.getElementById('childCards');
 287 |   const currentTerm = getCurrentTerm();
 288 |   container.innerHTML = state.children.map(child => {
 289 |     const s = getChildSummary(child.id, state.year);
 290 |     const od = getOverdueInfo(child.id, state.year);
 291 |     const termDue = s.termDue[currentTerm - 1];
 292 |     const termPaid = s.termPaid[currentTerm - 1];
 293 |     const termBal = Math.max(0, termDue - termPaid);
 294 | 
 295 |     let statusBadge = '<span class="badge badge-ok">Up to date</span>';
 296 |     if (s.balance > 0 && od.oldestOverdueDays > 0) {
 297 |       statusBadge = `<span class="badge badge-overdue">Overdue • ${od.ageing}</span>`;
 298 |     } else if (s.balance > 0) {
 299 |       statusBadge = '<span class="badge badge-partial">Balance remaining</span>';
 300 |     }
 301 |     if (s.arrears > s.arrearsCleared) {
 302 |       statusBadge += ' <span class="badge badge-arrears">Arrears</span>';
 303 |     }
 304 | 
 305 |     return `
 306 |       <div class="child-card">
 307 |         <div class="child-header">
 308 |           <div>
 309 |             <h2>${child.name}</h2>
 310 |             <div class="school">${child.school} • ${child.class}</div>
 311 |           </div>
 312 |           <div>${statusBadge}</div>
 313 |         </div>
 314 |         <div class="child-body">
 315 |           <div class="progress-wrap">
 316 |             <div class="progress-label">
 317 |               <span>Year Progress</span>
 318 |               <span>${s.pct}% • ${formatKES(s.paidTotal)} / ${formatKES(s.fees.yearly + s.arrears)}</span>
 319 |             </div>
 320 |             <div class="progress-bar"><div class="progress-fill" style="width:${s.pct}%"></div></div>
 321 |           </div>
 322 | 
 323 |           <div class="term-row">
 324 |             <span class="term-name">Arrears (brought forward)</span>
 325 |             <span class="amount ${s.arrears > s.arrearsCleared ? 'due' : 'paid'}">${formatKES(Math.max(0, s.arrears - s.arrearsCleared))}</span>
 326 |           </div>
 327 |           <div class="term-row">
 328 |             <span class="term-name">Term ${currentTerm} Due</span>
 329 |             <span class="amount">${formatKES(termDue)}</span>
 330 |           </div>
 331 |           <div class="term-row">
 332 |             <span class="term-name">Term ${currentTerm} Paid</span>
 333 |             <span class="amount paid">${formatKES(termPaid)}</span>
 334 |           </div>
 335 |           <div class="term-row">
 336 |             <span class="term-name">Term ${currentTerm} Balance</span>
 337 |             <span class="amount ${termBal > 0 ? 'due' : 'paid'}">${formatKES(termBal)}</span>
 338 |           </div>
 339 |           <div class="term-row" style="margin-top:0.5rem;padding-top:0.75rem;border-top:2px solid var(--border)">
 340 |             <span class="term-name">Total Outstanding</span>
 341 |             <span class="amount ${s.balance > 0 ? 'due' : 'paid'}" style="font-size:1.1rem">${formatKES(s.balance)}</span>
 342 |           </div>
 343 | 
 344 |           <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
 345 |             <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${child.id}')">+ Payment</button>
 346 |             <button class="btn btn-outline btn-sm" onclick="showChildDetail('${child.id}')">Full History</button>
 347 |             <button class="btn btn-outline btn-sm" onclick="openSettings()">Set Arrears / Fees</button>
 348 |           </div>
 349 |         </div>
 350 |       </div>
 351 |     `;
 352 |   }).join('');
 353 | }
 354 | 
 355 | function renderDetailTabs() {
 356 |   const tabs = document.getElementById('childTabs');
 357 |   const panels = document.getElementById('detailPanels');
 358 |   tabs.innerHTML = state.children.map((c, i) =>
 359 |     `<button class="tab ${i===0?'active':''}" onclick="switchTab('${c.id}')" data-child="${c.id}">${c.name.split(' ')[0]}</button>`
 360 |   ).join('');
 361 | 
 362 |   panels.innerHTML = state.children.map((child, i) => {
 363 |     const s = getChildSummary(child.id, state.year);
 364 |     const pays = state.payments
 365 |       .filter(p => p.childId === child.id)
 366 |       .sort((a,b) => b.date.localeCompare(a.date));
 367 | 
 368 |     const rows = pays.length ? pays.map(p => `
 369 |       <tr>
 370 |         <td>${p.date}</td>
 371 |         <td class="amount paid">${formatKES(p.amount)}</td>
 372 |         <td>${p.method}</td>
 373 |         <td>${p.ref || '—'}</td>
 374 |         <td>${p.allocate === 'arrears' ? 'Arrears' : p.allocate === 'current' ? 'Current Term' : p.allocate.replace('term','Term ')}</td>
 375 |         <td>${p.notes || '—'}</td>
 376 |         <td>${p.receiptBase64 ? '<span title="Receipt attached">📎</span>' : '—'}</td>
 377 |         <td>
 378 |           <button class="btn btn-outline btn-sm" onclick="editPayment('${p.id}')">Edit</button>
 379 |           <button class="btn btn-outline btn-sm" style="color:#e74c3c;border-color:#e74c3c" onclick="deletePayment('${p.id}')">Delete</button>
 380 |         </td>
 381 |       </tr>
 382 |     `).join('') : `<tr><td colspan="8" class="empty-state">No payments recorded yet</td></tr>`;
 383 | 
 384 |     return `
 385 |       <div class="panel ${i===0?'active':''}" id="panel-${child.id}">
 386 |         <div style="background:var(--card);border-radius:10px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
 387 |           <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1.25rem">
 388 |             <div><strong>Yearly Fee</strong><br>${formatKES(s.fees.yearly)}</div>
 389 |             <div><strong>Arrears</strong><br>${formatKES(s.arrears)}</div>
 390 |             <div><strong>Paid YTD</strong><br>${formatKES(s.paidTotal)}</div>
 391 |             <div><strong>Balance</strong><br><span class="${s.balance>0?'amount due':'amount paid'}">${formatKES(s.balance)}</span></div>
 392 |           </div>
 393 |           <h4 style="margin-bottom:0.75rem">Payment History</h4>
 394 |           <div class="table-wrap">
 395 |             <table>
 396 |               <thead>
 397 |                 <tr>
 398 |                   <th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Allocated</th><th>Notes</th><th>Receipt</th><th>Actions</th>
 399 |                 </tr>
 400 |               </thead>
 401 |               <tbody>${rows}</tbody>
 402 |             </table>
 403 |           </div>
 404 |         </div>
 405 |       </div>
 406 |     `;
 407 |   }).join('');
 408 | }
 409 | 
 410 | function switchTab(childId) {
 411 |   document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.child === childId));
 412 |   document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${childId}`));
 413 | }
 414 | 
 415 | function populatePaymentForm() {
 416 |   const sel = document.getElementById('payChild');
 417 |   sel.innerHTML = state.children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
 418 |   document.getElementById('payDate').value = todayISO();
 419 | }
 420 | 
 421 | // ===================== ACTIONS =====================
 422 | function openPaymentModal(childId) {
 423 |   editingPaymentId = null; 
 424 |   populatePaymentForm();
 425 |   if (childId) document.getElementById('payChild').value = childId;
 426 |   document.getElementById('payAmount').value = '';
 427 |   document.getElementById('payRef').value = '';
 428 |   document.getElementById('payNotes').value = '';
 429 |   document.getElementById('payFile').value = '';
 430 |   document.getElementById('paymentModal').classList.add('open');
 431 | }
 432 | 
 433 | function editPayment(paymentId) {
 434 |   const payment = state.payments.find(p => p.id === paymentId);
 435 |   if (!payment) return;
 436 | 
 437 |   editingPaymentId = paymentId;
 438 |   populatePaymentForm();
 439 | 
 440 |   document.getElementById('payChild').value = payment.childId;
 441 |   document.getElementById('payAmount').value = payment.amount;
 442 |   document.getElementById('payDate').value = payment.date;
 443 |   document.getElementById('payMethod').value = payment.method;
 444 |   document.getElementById('payRef').value = payment.ref || '';
 445 |   document.getElementById('payAllocate').value = payment.allocate || 'current';
 446 |   document.getElementById('payNotes').value = payment.notes || '';
 447 | 
 448 |   document.getElementById('paymentModal').classList.add('open');
 449 | }
 450 | 
 451 | function deletePayment(paymentId) {
 452 |   if (confirm('Are you sure you want to delete this payment record?')) {
 453 |     state.payments = state.payments.filter(p => p.id !== paymentId);
 454 |     saveState();
 455 |     renderAll();
 456 |   }
 457 | }
 458 | 
 459 | function closeModal(id) {
 460 |   editingPaymentId = null;
 461 |   document.getElementById(id).classList.remove('open');
 462 | }
 463 | 
 464 | function savePayment() {
 465 |   const childId = document.getElementById('payChild').value;
 466 |   const amount = Number(document.getElementById('payAmount').value);
 467 |   const date = document.getElementById('payDate').value;
 468 |   const method = document.getElementById('payMethod').value;
 469 |   const ref = document.getElementById('payRef').value.trim();
 470 |   const allocate = document.getElementById('payAllocate').value;
 471 |   const notes = document.getElementById('payNotes').value.trim();
 472 |   const fileInput = document.getElementById('payFile');
 473 | 
 474 |   if (!amount || amount <= 0 || !date) {
 475 |     alert('Please enter a valid amount and date.');
 476 |     return;
 477 |   }
 478 | 
 479 |   const paymentData = {
 480 |     childId,
 481 |     amount,
 482 |     date,
 483 |     method,
 484 |     ref,
 485 |     allocate,
 486 |     notes
 487 |   };
 488 | 
 489 |   if (fileInput.files && fileInput.files[0]) {
 490 |     const reader = new FileReader();
 491 |     reader.onload = function(e) {
 492 |       paymentData.receiptBase64 = e.target.result;
 493 |       finalizePayment(paymentData);
 494 |     };
 495 |     reader.readAsDataURL(fileInput.files[0]);
 496 |   } else {
 497 |     finalizePayment(paymentData);
 498 |   }
 499 | }
 500 | 
 501 | function finalizePayment(paymentData) {
 502 |   if (editingPaymentId) {
 503 |     const index = state.payments.findIndex(p => p.id === editingPaymentId);
 504 |     if (index !== -1) {
 505 |       state.payments[index] = {
 506 |         ...state.payments[index],
 507 |         ...paymentData,
 508 |         receiptBase64: paymentData.receiptBase64 || state.payments[index].receiptBase64
 509 |       };
 510 |     }
 511 |     editingPaymentId = null;
 512 |   } else {
 513 |     const payment = {
 514 |       id: uid(),
 515 |       ...paymentData,
 516 |       receiptBase64: paymentData.receiptBase64 || null,
 517 |       createdAt: new Date().toISOString()
 518 |     };
 519 |     state.payments.push(payment);
 520 |   }
 521 | 
 522 |   saveState();
 523 |   closeModal('paymentModal');
 524 |   renderAll();
 525 | }
