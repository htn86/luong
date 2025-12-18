'use strict';

import { SalaryModel } from './model.js';
import { renderTotals } from './view.js';
import { getInputNumber, el } from './utils.js';
import { readExcelFile, exportResults, generateTemplate } from './excelHelper.js';

/*
  Controller (patched)
  - Patch 2: default socialSalary to salaryForNormalHours when input missing/zero to avoid insuranceBase=0
  - Keeps live bindings and debug logging as before.
*/

const DEBUG = true;
const now = () => (new Date()).toISOString();
function log(...args) { if (!DEBUG) return; console.log(now(), ...args); }
function groupStart(name) { if (!DEBUG) return; console.groupCollapsed(`${now()} ${name}`); }
function groupEnd() { if (!DEBUG) return; console.groupEnd(); }
function logWarn(...args) { if (!DEBUG) return; console.warn(...args); }

let employeeList = [];
let currentIndex = 0;

const inputIds = [
  'empCode','empName','contractType',
  'periodMonth','periodYear',
  'payDay','payMonth','payYear',
  'salaryForNormalHours',
  'socialSalary','isBHXH','isBHTN','insurancePayer', // Xác định tình trạng, đối tượng chịu chi phí bảo hiểm
  'allowanceSalary','attendanceAllowanceBase','nonTaxableIncome','numDependents',
  'isResident','taxMode','numDependents_tax','otherTaxableIncomeInPeriod','taxFreeIncome','taxNote',
  'h_norm_day','h_norm_break','h_norm_ot_150','h_norm_ot_210',
  'h_night_100','h_night_130','h_night_break','h_night_ot_200','h_night_ot_150',
  'h_sun_day','h_sun_night_270','h_sun_night_200',
  'h_hol_day','h_hol_night','h_hol_ot_300',
  'paidLeaveDays','companyLeaveDays'
];

function readModelFromInputs() {
  const values = {};
  inputIds.forEach(id => {
    const node = el(id);
    if (!node) return;
    if (node.tagName === 'INPUT' && node.type === 'number') {
      values[id] = getInputNumber(id, 0);
    } else {
      values[id] = node.value;
    }
  });

  // support legacy paymentYear/payMonth/paymentDay fields
  const pyNode = el('paymentYear') || el('payYear');
  const pmNode = el('paymentMonth') || el('payMonth');
  const pdNode = el('paymentDay') || el('payDay');
  if (pyNode) values.paymentYear = pyNode.value;
  if (pmNode) values.paymentMonth = pmNode.value;
  if (pdNode) values.paymentDay = pdNode.value;

  // --- Patch 2: normalize socialSalary to default to salaryForNormalHours if missing/zero
  if (!values.socialSalary || Number(values.socialSalary) === 0) {
    values.socialSalary = Number(values.salaryForNormalHours) || 0;
    if (DEBUG) {
      log('Controller: socialSalary was empty/zero -> defaulted to salaryForNormalHours:', values.socialSalary);
    }
  }

  if (DEBUG) {
    groupStart('Controller.readModelFromInputs');
    console.log('Raw input values object:', JSON.parse(JSON.stringify(values)));
    groupEnd();
  }

  return new SalaryModel(values);
}

function calculateAndRender() {
  groupStart('Controller.calculateAndRender');
  if (employeeList.length === 0) {
    employeeList = [ readModelFromInputs() ];
    currentIndex = 0;
  }

  const model = employeeList[currentIndex];
  log('Calling model.calculate() for current employee index', currentIndex);
  const comps = model.calculate ? model.calculate() : model.comps;
  log('Model returned comps (summary):', {
    totalIncome: comps.totalIncome,
    insuranceDeduction: comps.insuranceDeduction,
    personalIncomeTax: comps.personalIncomeTax,
    netSalary: comps.netSalary
  });

  if (DEBUG) {
    console.groupCollapsed('COMPS (detailed)');
    console.log(JSON.parse(JSON.stringify(comps)));
    console.groupEnd();
  }

  log('Rendering view.renderTotals...');
  renderTotals(comps);
  log('renderTotals called.');

  const navInfo = el('empNavInfo');
  if (navInfo) navInfo.textContent = `${currentIndex + 1} / ${employeeList.length}`;

  const empNameDisplay = el('displayEmpName');
  if(empNameDisplay) empNameDisplay.textContent = model.data.empName || model.comps.empName || '--';

  groupEnd();
}

function switchEmployee(index) {
  if (index < 0 || index >= employeeList.length) {
    log('switchEmployee: index out of range', index);
    return;
  }
  log('Switching employee to index', index);
  currentIndex = index;
  const data = employeeList[currentIndex].data || {};
  Object.keys(data).forEach(k => {
    const node = el(k);
    if (node) node.value = data[k];
  });
  calculateAndRender();
}

export function setupController() {
  log('setupController start');

  employeeList = [ readModelFromInputs() ];
  currentIndex = 0;

  inputIds.forEach(id => {
    const node = el(id);
    if (!node) return;
    node.addEventListener('input', () => {
      if (DEBUG) log(`input event on ${id} -> update model & recalc`);
      employeeList[currentIndex] = readModelFromInputs();
      calculateAndRender();
    });
    node.addEventListener('change', () => {
      if (DEBUG) log(`change event on ${id} -> update model & recalc`);
      employeeList[currentIndex] = readModelFromInputs();
      calculateAndRender();
    });
  });

  const fileInput = el('uploadExcel') || el('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        try {
          const list = await readExcelFile(e.target.files[0]);
          log(`Imported ${list.length} records from Excel`);
          employeeList = list;
          currentIndex = 0;
          switchEmployee(0);
        } catch (err) {
          logWarn('Excel import error', err);
          if (err && err.isValidationError && Array.isArray(err.messages)) {
            alert('Lỗi dữ liệu: \n' + err.messages.join('\n'));
          } else {
            alert('Lỗi khi đọc file: ' + (err && err.message ? err.message : err));
          }
        }
        e.target.value = '';
      }
    });
  }

  const exportBtn = el('exportBtn') || el('exportResultBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        exportResults(employeeList);
        log('Exported results to Excel.');
      } catch (err) {
        logWarn('Export error', err);
        alert('Lỗi xuất Excel: ' + (err.message || err));
      }
    });
  }

  const templateBtn = el('downloadTemplateBtn');
  if (templateBtn) {
    templateBtn.addEventListener('click', () => {
      generateTemplate();
      log('Template generated/downloaded.');
    });
  }

  const btnPrev = el('prevEmpBtn');
  if (btnPrev) btnPrev.addEventListener('click', () => {
    if (currentIndex > 0) switchEmployee(currentIndex - 1);
  });
  const btnNext = el('nextEmpBtn');
  if (btnNext) btnNext.addEventListener('click', () => {
    if (currentIndex < employeeList.length - 1) switchEmployee(currentIndex + 1);
  });

  const recalcBtn = el('recalcBtn');
  if (recalcBtn) recalcBtn.addEventListener('click', () => calculateAndRender());
  const resetBtn = el('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    const toReset = [
      'salaryForNormalHours','salaryForOvertime','socialSalary','planLeaveSalary','allowanceSalary',
      'attendanceAllowanceBase','otherTaxableIncome','nonTaxableIncome','workingDaysInMonth','standardHours',
      'h_norm_day','h_norm_break','h_norm_ot_150','h_norm_ot_210',
      'h_night_100','h_night_130','h_night_break','h_night_ot_200','h_night_ot_150',
      'h_sun_day','h_sun_night_270','h_sun_night_200',
      'h_hol_day','h_hol_night','h_hol_ot_300',
      'paidLeaveDays','companyLeaveDays',
      'isBHXH', 'isBHTN', 'insurancePayer',
      'otherTaxableIncomeInPeriod','taxFreeIncome','numDependents','numDependents_tax'
    ];
    toReset.forEach(id => {
      const node = el(id);
      if (!node) return;
      if (id === 'attendanceAllowanceBase') node.value = '500000';
      else if (id === 'workingDaysInMonth') node.value = '26';
      else node.value = '0';
    });
    if (el('isResident')) el('isResident').value = '1';
    if (el('taxMode')) el('taxMode').value = 'progressive';
    if (el('contractType')) el('contractType').value = 'official';
    calculateAndRender();
  });

  calculateAndRender();

  log('setupController end');
}