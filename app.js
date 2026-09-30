<script>
    // ===================== DATA MODEL =====================
    const DEFAULT_YEAR = 2026;
    const STORAGE_KEY = 'oguta_fees_v1';

    const DEFAULT_CHILDREN = [
      {
        id: 'derek',
        name: 'Derek Oguta',
        school: "St. Joseph's Rapogi School",
        class: 'Secondary',
        fees: {
          2026: { yearly: 61054, term1: 28777, term2: 18066, term3: 12011 }
        }
      },
      {
        id: 'brian',
        name: 'Brian Oguta Jr.',
        school: 'Christian Outreach Academy',
        class: 'Grade 3',
        fees: {
          2026: { yearly: 33000, term1: 11000, term2: 11000, term3: 11000 }
        }
      },
      {
        id: 'joseph',
        name: 'Joseph Oguta',
        school: 'Christian Outreach Academy',
        class: 'Playgroup',
        fees: {
          2026: { yearly: 27000, term1: 9000, term2: 9000, term3: 9000 }
        }
      }
    ];

    // Term calendar (approximate for 2026)
    const TERM_DATES = {
      1: { start: '2026-01-06', end: '2026-03-15', months: [1,2,3], dueDays: [7,7,7] },
      2: { start: '2026-05-15', end: '2026-07-15', months: [5,6,7], dueDays: [7,7,7] },
      3: { start: '2026-08-15', end: '2026-10-15', months: [8,9,10], dueDays: [7,7,7] }
    };

    let state = {
      year: DEFAULT_YEAR,
      children: [],
      payments: [], // { id, childId, amount, date, method, ref, allocate, notes, receiptBase64, createdAt }
      arrears: {}   // { childId: { [year]: amount } }
    };

    // Tracking state for editing existing records
    let editingPaymentId = null;

    // ===================== UTILITIES =====================
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
    function formatKES(n) {
      return 'KES ' + Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });
    }
    function todayISO() {
      const d = new Date();
      return d.toISOString().slice(0,10);
    }
    function parseDate(s) { return new Date(s + 'T00:00:00'); }
    function daysBetween(d1, d2) {
      return Math.floor((parseDate(d2) - parseDate(d1)) / 86400000);
    }

    function getCurrentTerm(year = state.year) {
      const today = new Date();
      const y = today.getFullYear();
      if (y < year) return 1;
      if (y > year) return 3;
      const m = today.getMonth() + 1;
      if (m <= 3) return 1;
      if (m <= 7) return 2;
      return 3;
    }

    function getTermDueDate(year, term, instalment = 1) {
      const td = TERM_DATES[term];
      if (!td) return null;
      const month = td.months[instalment - 1];
      const day = td.dueDays[instalment - 1] || 7;
      return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }

    // ===================== PERSISTENCE =====================
    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          state = JSON.parse(raw);
          if (!state.children || state.children.length === 0) {
            state.children = JSON.parse(JSON.stringify(DEFAULT_CHILDREN));
          }
          if (!state.payments) state.payments = [];
          if (!state.arrears) state.arrears = {};
          if (!state.year) state.year = DEFAULT_YEAR;
        } else {
          state.children = JSON.parse(JSON.stringify(DEFAULT_CHILDREN));
          state.payments = [];
          state.arrears = {};
          state.year = DEFAULT_YEAR;
          saveState();
        }
      } catch (e) {
        console.error(e);
        state.children = JSON.parse(JSON.stringify(DEFAULT_CHILDREN));
        state.payments = [];
        state.arrears = {};
        state.year = DEFAULT_YEAR;
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    // ===================== CALCULATIONS =====================
    function getChildFees(childId, year) {
      const child = state.children.find(c => c.id === childId);
      if (!child) return { yearly:0, term1:0, term2:0, term3:0 };
      return child.fees[year] || { yearly:0, term1:0, term2:0, term3:0 };
    }

    function getArrears(childId, year) {
      return (state.arrears[childId] && state.arrears[childId][year]) || 0;
    }

    function getPaymentsFor(childId, year, term = null) {
      return state.payments.filter(p => {
        if (p.childId !== childId) return false;
        const py = parseInt(p.date.slice(0,4), 10);
        if (py !== year && p.allocate !== 'arrears') return false;
        if (term === null) return true;
        if (p.allocate === 'arrears') return false;
        if (p.allocate === 'current') {
          return getCurrentTerm(year) === term;
        }
        return p.allocate === `term${term}`;
      });
    }

    function sumPayments(payments) {
      return payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    }

    function getChildSummary(childId, year) {
      const fees = getChildFees(childId, year);
      const arrears = getArrears(childId, year);
      const allPays = state.payments.filter(p => p.childId === childId && (parseInt(p.date.slice(0,4)) === year || p.allocate === 'arrears'));
      const paidTotal = sumPayments(allPays);

      let arrearsCleared = 0;
      const termCleared = [0, 0, 0];
      const currentTerm = getCurrentTerm(year);

      allPays.forEach(p => {
        const amt = Number(p.amount || 0);
        if (p.allocate === 'arrears') {
          arrearsCleared += amt;
        } else if (p.allocate === 'current') {
          termCleared[currentTerm - 1] += amt;
        } else if (p.allocate === 'term1') {
          termCleared[0] += amt;
        } else if (p.allocate === 'term2') {
          termCleared[1] += amt;
        } else if (p.allocate === 'term3') {
          termCleared[2] += amt;
        } else {
          termCleared[currentTerm - 1] += amt;
        }
      });

      arrearsCleared = Math.min(arrears, arrearsCleared);
      termCleared[0] = Math.min(fees.term1, termCleared[0]);
      termCleared[1] = Math.min(fees.term2, termCleared[1]);
      termCleared[2] = Math.min(fees.term3, termCleared[2]);

      const totalDue = arrears + fees.yearly;
      const balance = Math.max(0, totalDue - paidTotal);
      const pct = totalDue > 0 ? Math.min(100, Math.round((paidTotal / totalDue) * 100)) : 100;

      return {
        fees, arrears, paidTotal, balance, pct,
        termDue: [fees.term1, fees.term2, fees.term3],
        termPaid: termCleared,
        arrearsCleared
      };
    }

    function getOverdueInfo(childId, year) {
      const currentTerm = getCurrentTerm(year);
      const fees = getChildFees(childId, year);
      const summary = getChildSummary(childId, year);
      const today = todayISO();
      let oldestOverdueDays = 0;
      let overdueAmount = 0;

      for (let t = 1; t <= currentTerm; t++) {
        const termDue = [fees.term1, fees.term2, fees.term3][t-1];
        const instalment = termDue / 3;
        for (let i = 1; i <= 3; i++) {
          const dueDate = getTermDueDate(year, t, i);
          if (!dueDate || dueDate > today) continue;
          const paidForTerm = summary.termPaid[t-1];
          const expectedByNow = instalment * i;
          if (paidForTerm < expectedByNow - 1) {
            const days = daysBetween(dueDate, today);
            if (days > oldestOverdueDays) oldestOverdueDays = days;
            overdueAmount += Math.max(0, expectedByNow - paidForTerm);
          }
        }
      }
      if (summary.arrears > summary.arrearsCleared) {
        oldestOverdueDays = Math.max(oldestOverdueDays, 60);
        overdueAmount += (summary.arrears - summary.arrearsCleared);
      }

      let ageing = 'Current';
      if (oldestOverdueDays > 60) ageing = '61+ days';
      else if (oldestOverdueDays > 30) ageing = '31–60 days';
      else if (oldestOverdueDays > 0) ageing = '0–30 days';

      return { oldestOverdueDays, overdueAmount, ageing };
    }

    // ===================== RENDER =====================
    function renderAll() {
      document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-KE', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
      });
      const ct = getCurrentTerm();
      document.getElementById('currentTermLabel').textContent = `Term ${ct} ${state.year}`;

      const ys = document.getElementById('yearSelect');
      ys.innerHTML = '';
      for (let y = state.year - 2; y <= state.year + 2; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === state.year) opt.selected = true;
        ys.appendChild(opt);
      }

      renderFamilySummary();
      renderChildCards();
      renderDetailTabs();
      populatePaymentForm();
    }

    function renderFamilySummary() {
      let totalDue = 0, totalPaid = 0, totalBalance = 0, totalArrears = 0;
      state.children.forEach(c => {
        const s = getChildSummary(c.id, state.year);
        totalDue += s.fees.yearly + s.arrears;
        totalPaid += s.paidTotal;
        totalBalance += s.balance;
        totalArrears += Math.max(0, s.arrears - s.arrearsCleared);
      });
      const pct = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;

      document.getElementById('familySummary').innerHTML = `
        <div class="summary-card">
          <h3>Family Total Due (${state.year})</h3>
          <div class="value">${formatKES(totalDue)}</div>
          <div class="sub">Including arrears</div>
        </div>
        <div class="summary-card success">
          <h3>Total Paid</h3>
          <div class="value">${formatKES(totalPaid)}</div>
          <div class="sub">${pct}% of annual obligation</div>
        </div>
        <div class="summary-card ${totalBalance > 0 ? 'danger' : 'success'}">
          <h3>Outstanding Balance</h3>
          <div class="value">${formatKES(totalBalance)}</div>
          <div class="sub">${totalBalance === 0 ? 'All clear' : 'Across all children'}</div>
        </div>
        <div class="summary-card warning">
          <h3>Open Arrears</h3>
          <div class="value">${formatKES(totalArrears)}</div>
          <div class="sub">Carried forward</div>
        </div>
      `;
    }

    function renderChildCards() {
      const container = document.getElementById('childCards');
      const currentTerm = getCurrentTerm();
      container.innerHTML = state.children.map(child => {
        const s = getChildSummary(child.id, state.year);
        const od = getOverdueInfo(child.id, state.year);
        const termDue = s.termDue[currentTerm - 1];
        const termPaid = s.termPaid[currentTerm - 1];
        const termBal = Math.max(0, termDue - termPaid);

        let statusBadge = '<span class="badge badge-ok">Up to date</span>';
        if (s.balance > 0 && od.oldestOverdueDays > 0) {
          statusBadge = `<span class="badge badge-overdue">Overdue • ${od.ageing}</span>`;
        } else if (s.balance > 0) {
          statusBadge = '<span class="badge badge-partial">Balance remaining</span>';
        }
        if (s.arrears > s.arrearsCleared) {
          statusBadge += ' <span class="badge badge-arrears">Arrears</span>';
        }

        return `
          <div class="child-card">
            <div class="child-header">
              <div>
                <h2>${child.name}</h2>
                <div class="school">${child.school} • ${child.class}</div>
              </div>
              <div>${statusBadge}</div>
            </div>
            <div class="child-body">
              <div class="progress-wrap">
                <div class="progress-label">
                  <span>Year Progress</span>
                  <span>${s.pct}% • ${formatKES(s.paidTotal)} / ${formatKES(s.fees.yearly + s.arrears)}</span>
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width:${s.pct}%"></div></div>
              </div>

              <div class="term-row">
                <span class="term-name">Arrears (brought forward)</span>
                <span class="amount ${s.arrears > s.arrearsCleared ? 'due' : 'paid'}">${formatKES(Math.max(0, s.arrears - s.arrearsCleared))}</span>
              </div>
              <div class="term-row">
                <span class="term-name">Term ${currentTerm} Due</span>
                <span class="amount">${formatKES(termDue)}</span>
              </div>
              <div class="term-row">
                <span class="term-name">Term ${currentTerm} Paid</span>
                <span class="amount paid">${formatKES(termPaid)}</span>
              </div>
              <div class="term-row">
                <span class="term-name">Term ${currentTerm} Balance</span>
                <span class="amount ${termBal > 0 ? 'due' : 'paid'}">${formatKES(termBal)}</span>
              </div>
              <div class="term-row" style="margin-top:0.5rem;padding-top:0.75rem;border-top:2px solid var(--border)">
                <span class="term-name">Total Outstanding</span>
                <span class="amount ${s.balance > 0 ? 'due' : 'paid'}" style="font-size:1.1rem">${formatKES(s.balance)}</span>
              </div>

              <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${child.id}')">+ Payment</button>
                <button class="btn btn-outline btn-sm" onclick="showChildDetail('${child.id}')">Full History</button>
                <button class="btn btn-outline btn-sm" onclick="openSettings()">Set Arrears / Fees</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderDetailTabs() {
      const tabs = document.getElementById('childTabs');
      const panels = document.getElementById('detailPanels');
      tabs.innerHTML = state.children.map((c, i) =>
        `<button class="tab ${i===0?'active':''}" onclick="switchTab('${c.id}')" data-child="${c.id}">${c.name.split(' ')[0]}</button>`
      ).join('');

      panels.innerHTML = state.children.map((child, i) => {
        const s = getChildSummary(child.id, state.year);
        const pays = state.payments
          .filter(p => p.childId === child.id)
          .sort((a,b) => b.date.localeCompare(a.date));

        // Added Actions column to rows
        const rows = pays.length ? pays.map(p => `
          <tr>
            <td>${p.date}</td>
            <td class="amount paid">${formatKES(p.amount)}</td>
            <td>${p.method}</td>
            <td>${p.ref || '—'}</td>
            <td>${p.allocate === 'arrears' ? 'Arrears' : p.allocate === 'current' ? 'Current Term' : p.allocate.replace('term','Term ')}</td>
            <td>${p.notes || '—'}</td>
            <td>${p.receiptBase64 ? '<span title="Receipt attached">📎</span>' : '—'}</td>
            <td>
              <button class="btn btn-outline btn-sm" onclick="editPayment('${p.id}')">Edit</button>
              <button class="btn btn-outline btn-sm" style="color:#e74c3c;border-color:#e74c3c" onclick="deletePayment('${p.id}')">Delete</button>
            </td>
          </tr>
        `).join('') : `<tr><td colspan="8" class="empty-state">No payments recorded yet</td></tr>`;

        return `
          <div class="panel ${i===0?'active':''}" id="panel-${child.id}">
            <div style="background:var(--card);border-radius:10px;padding:1.25rem;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin-bottom:1.25rem">
                <div><strong>Yearly Fee</strong><br>${formatKES(s.fees.yearly)}</div>
                <div><strong>Arrears</strong><br>${formatKES(s.arrears)}</div>
                <div><strong>Paid YTD</strong><br>${formatKES(s.paidTotal)}</div>
                <div><strong>Balance</strong><br><span class="${s.balance>0?'amount due':'amount paid'}">${formatKES(s.balance)}</span></div>
              </div>
              <h4 style="margin-bottom:0.75rem">Payment History</h4>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Allocated</th><th>Notes</th><th>Receipt</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    function switchTab(childId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.child === childId));
      document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${childId}`));
    }

    function populatePaymentForm() {
      const sel = document.getElementById('payChild');
      sel.innerHTML = state.children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      document.getElementById('payDate').value = todayISO();
    }

    // ===================== ACTIONS =====================
    function openPaymentModal(childId) {
      editingPaymentId = null; // Reset edit tracker on new open
      populatePaymentForm();
      if (childId) document.getElementById('payChild').value = childId;
      document.getElementById('payAmount').value = '';
      document.getElementById('payRef').value = '';
      document.getElementById('payNotes').value = '';
      document.getElementById('payFile').value = '';
      document.getElementById('paymentModal').classList.add('open');
    }

    // Edit payment population function
    function editPayment(paymentId) {
      const payment = state.payments.find(p => p.id === paymentId);
      if (!payment) return;

      editingPaymentId = paymentId;
      populatePaymentForm();

      document.getElementById('payChild').value = payment.childId;
      document.getElementById('payAmount').value = payment.amount;
      document.getElementById('payDate').value = payment.date;
      document.getElementById('payMethod').value = payment.method;
      document.getElementById('payRef').value = payment.ref || '';
      document.getElementById('payAllocate').value = payment.allocate || 'current';
      document.getElementById('payNotes').value = payment.notes || '';

      document.getElementById('paymentModal').classList.add('open');
    }

    // Delete payment function
    function deletePayment(paymentId) {
      if (confirm('Are you sure you want to delete this payment record?')) {
        state.payments = state.payments.filter(p => p.id !== paymentId);
        saveState();
        renderAll();
      }
    }

    function closeModal(id) {
      editingPaymentId = null;
      document.getElementById(id).classList.remove('open');
    }

    function savePayment() {
      const childId = document.getElementById('payChild').value;
      const amount = Number(document.getElementById('payAmount').value);
      const date = document.getElementById('payDate').value;
      const method = document.getElementById('payMethod').value;
      const ref = document.getElementById('payRef').value.trim();
      const allocate = document.getElementById('payAllocate').value;
      const notes = document.getElementById('payNotes').value.trim();
      const fileInput = document.getElementById('payFile');

      if (!amount || amount <= 0 || !date) {
        alert('Please enter a valid amount and date.');
        return;
      }

      const paymentData = {
        childId,
        amount,
        date,
        method,
        ref,
        allocate,
        notes
      };

      if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          paymentData.receiptBase64 = e.target.result;
          finalizePayment(paymentData);
        };
        reader.readAsDataURL(fileInput.files[0]);
      } else
