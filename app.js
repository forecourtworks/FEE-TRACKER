let children = ['Child 1', 'Child 2', 'Child 3'];
let activeChild = children[0];
let childrenData = JSON.parse(localStorage.getItem('childrenData')) || {};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  renderTable();

  const form = document.getElementById('fee-form');
  form.addEventListener('submit', handleFormSubmit);

  document.getElementById('form-cancel-btn').addEventListener('click', resetForm);
});

function initTabs() {
  const tabsContainer = document.getElementById('child-tabs');
  tabsContainer.innerHTML = '';

  children.forEach(child => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${child === activeChild ? 'active' : ''}`;
    btn.innerText = child;
    btn.onclick = () => {
      activeChild = child;
      resetForm();
      initTabs();
      renderTable();
    };
    tabsContainer.appendChild(btn);
  });
}

function renderTable() {
  document.getElementById('active-child-heading').innerText = `${activeChild} Fee Records`;
  const tbody = document.getElementById('child-records-body');
  tbody.innerHTML = '';

  const records = childrenData[activeChild] || [];

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No records found for ${activeChild}.</td></tr>`;
    return;
  }

  records.forEach((record, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${record.date}</td>
      <td>${record.description}</td>
      <td>${Number(record.amount).toFixed(2)}</td>
      <td class="no-print">
        <button class="btn-edit" onclick="editRecord('${activeChild}', ${index})">Edit</button>
        <button class="btn-delete" onclick="deleteRecord('${activeChild}', ${index})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function handleFormSubmit(e) {
  e.preventDefault();

  const date = document.getElementById('entry-date').value;
  const description = document.getElementById('entry-desc').value;
  const amount = document.getElementById('entry-amount').value;

  if (!childrenData[activeChild]) {
    childrenData[activeChild] = [];
  }

  const form = document.getElementById('fee-form');
  const editIndex = form.dataset.editIndex;

  if (editIndex !== undefined && editIndex !== '') {
    childrenData[activeChild][editIndex] = { date, description, amount };
  } else {
    childrenData[activeChild].push({ date, description, amount });
  }

  saveData();
  resetForm();
  renderTable();
}

function editRecord(child, index) {
  const record = childrenData[child][index];
  
  document.getElementById('entry-date').value = record.date;
  document.getElementById('entry-desc').value = record.description;
  document.getElementById('entry-amount').value = record.amount;

  const form = document.getElementById('fee-form');
  form.dataset.editIndex = index;

  document.getElementById('form-submit-btn').innerText = 'Update Entry';
  document.getElementById('form-cancel-btn').style.display = 'inline-block';
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteRecord(child, index) {
  if (confirm('Are you sure you want to delete this fee record?')) {
    childrenData[child].splice(index, 1);
    saveData();
    renderTable();
  }
}

function resetForm() {
  const form = document.getElementById('fee-form');
  form.reset();
  delete form.dataset.editIndex;
  document.getElementById('form-submit-btn').innerText = 'Add Entry';
  document.getElementById('form-cancel-btn').style.display = 'none';
}

function saveData() {
  localStorage.setItem('childrenData', JSON.stringify(childrenData));
}
