'use strict';

import { formatVND, setText, el } from './utils.js';

/*
  View layer (sửa): sử dụng tên thuộc tính trả về từ model.js (baseSalaryMonthly, pcbMonthly, salaryFromNonHoliday, totalSalaryFromHours, totalAllowance, totalIncome, insuranceDeduction, personalIncomeTax, netSalary, details...).
*/

function renderSalaryDetailTable(comps) {
  const hourlyRate = comps.hourlyRate || 0;
  const rows = [
    { k: 'Lương cơ bản (LCB)', v: comps.baseSalaryMonthly || 0 },
    { k: 'Đơn giá giờ', v: hourlyRate || 0 },
    { k: 'Thu nhập giờ & OT (non-holiday)', v: comps.salaryFromNonHoliday || 0 },
    { k: 'Lương ngày lễ/tết', v: comps.salaryFromHoliday || 0 },
    { k: 'Lương nghỉ phép (có lương)', v: comps.paidLeavePay || 0 },
    { k: 'Lương nghỉ chờ/cty', v: comps.companyLeavePay || 0 },
    { k: 'Tổng LƯƠNG từ giờ (totalSalaryFromHours)', v: comps.totalSalaryFromHours || 0 }
  ];

  const header = `<table class="detail-table"><thead><tr><th>Mục</th><th class="text-right">Số tiền</th></tr></thead><tbody>`;
  const body = rows.map(r => `<tr><td>${r.k}</td><td class="text-right">${formatVND(r.v)}</td></tr>`).join('');
  const foot = `</tbody></table>`;
  return header + body + foot;
}

function renderAllowanceBonusTable(comps) {
  const rows = [
    { k: 'Phụ cấp cơ bản (PCB - monthly)', v: comps.pcbMonthly || 0 },
    { k: 'Phụ cấp theo giờ (từ PCB prorated)', v: comps.totalAllowanceFromHours || 0 },
    { k: 'Phụ cấp chuyên cần (LCC)', v: comps.attendanceAllowanceBase || 0 },
    { k: 'Phụ cấp khác / Thu nhập khác (kỳ này)', v: (comps.otherTaxableIncome || 0) + (comps.otherTaxableIncomeInPeriod || 0) },
    { k: 'Tổng cộng phụ cấp', v: (comps.totalAllowance || 0)}
  ];
  const header = `<table class="detail-table"><thead><tr><th>Phụ cấp / Thưởng</th><th class="text-right">Số tiền</th></tr></thead><tbody>`;
  const body = rows.map(r => `<tr><td>${r.k}</td><td class="text-right">${formatVND(r.v)}</td></tr>`).join('');
  return header + body + `</tbody></table>`;
}

// Render phần hiển thị chi tiết bảo hiểm
function renderInsuranceDetail(comps) {
  const insuranceRates = comps.insuranceRates || {};
  const insuranceBase = comps.cappedBase || 0;
  const insurancePayer = comps.insurancePayer || 'NLD';
  const isBHXH = comps.isBHXH || 0;
  const isBHTN = comps.isBHTN || 0;
  const mustpayBHXH = compsmustpayBHXH || false;
  const mustpayBHTN = comps.mustpayBHTN || false;

  if (isBHXH !== '1' || !mustpayBHXH) {
    return '<p>Không tham gia bảo hiểm.</p>';
  }

  let displayTotal = 0;
  const rows = [];

  if (insurancePayer === 'DN') {
    return '<p>Doanh nghiệp chịu khấu trừ bảo hiểm - Không hiển thị chi tiết.</p>';
  }

  // Thêm BHXH và BHYT luôn (giả sử luôn có nếu BHXH=1)
  ['BHXH', 'BHYT'].forEach(code => {
    if (code in insuranceRates) {
      const rate = insuranceRates[code];
      const amt = insuranceBase * rate;
      rows.push({ code, rate, amt });
      displayTotal += amt;
    }
  });

  // Thêm BHTN chỉ nếu isBHTN=1 và mustpayBHTN
  if (isBHTN === '1' && mustpayBHTN && 'BHTN' in insuranceRates) {
    const rate = insuranceRates['BHTN'];
    const amt = insuranceBase * rate;
    rows.push({ code: 'BHTN', rate, amt });
    displayTotal += amt;
  }

  if (rows.length === 0) {
    return '<p>Không có khấu trừ bảo hiểm để hiển thị.</p>';
  }

  const header = `<table class="detail-table"><thead><tr><th>Mã</th><th class="text-right">Tỉ lệ</th><th class="text-right">Số tiền</th></tr></thead><tbody>`;
  const body = rows.map(r => `<tr><td>${r.code}</td><td class="text-right">${(r.rate*100).toFixed(2)}%</td><td class="text-right">${formatVND(r.amt)}</td></tr>`).join('');
  const foot = `<tr><td><strong>Tổng</strong></td><td></td><td class="text-right"><strong>${formatVND(displayTotal)}</strong></td></tr>`;
  return header + body + `</tbody><tfoot>${foot}</tfoot></table>`;
}
// Kết thúc render chi tiết bảo hiểm

// Render phần hiển thị chi tiết thuế

function renderTaxDetail(comps) {
  const tax = (comps.details && comps.details.tax) ? comps.details.tax : {};
  const relief = (comps.details && comps.details.relief) ? comps.details.relief : {};
  const method = tax.method || comps.taxMode || '';
  const note = comps.taxNote || '';
  // Note: Assume comps.isResident has been added in model.js as this.comps.isResident = d.isResident;
  const isFlatRate = (method === 'flat_10') || (comps.isResident === '0');

  const displayInsurance = isFlatRate ? 0 : (comps.insuranceDeduction || 0);
  const displayPersonalRelief = isFlatRate ? 0 : (relief.personalRelief || 0);
  const displayDependentRelief = isFlatRate ? 0 : (relief.dependentRelief || 0);
  const displayTotalReduction = displayPersonalRelief + displayDependentRelief;
  const displayAssessable = (comps.totalIncome || 0) - displayInsurance - displayTotalReduction;
  return `
    <div style="margin-bottom:8px; font-size:0.95em; color:#374151;">
      <div><strong>Phương pháp thuế:</strong> ${method}</div>
      ${note ? `<div style="margin-top:4px;"><strong>Ghi chú:</strong> ${note}</div>` : ''}
    </div>
    <table class="detail-table">
      <thead><tr><th>Mục</th><th class="text-right">Số tiền</th></tr></thead>
      <tbody>
        <tr><td>D1-Thu nhập chịu thuế</td><td class="text-right">${formatVND(comps.totalIncome || 0)}</td></tr>
        <tr><td>D2-Bảo hiểm (NV)</td><td class="text-right">-${formatVND(displayInsurance)}</td></tr>
        <tr><td>D31-Giảm trừ cá nhân</td><td class="text-right">-${formatVND(displayPersonalRelief)}</td></tr>
        <tr><td>D32-Giảm trừ phụ thuộc</td><td class="text-right">-${formatVND(displayDependentRelief)}</td></tr>
        <tr><td>D4-Tổng giảm trù</td><td class="text-right">-${formatVND(displayTotalReduction)}</td></tr>
        <tr><td>D5-Thu nhập tính thuế = D1-D4</td><td class="text-right"><strong>${formatVND(displayAssessable)}</strong></td></tr>
        <tr><td>Thuế TNCN</td><td class="text-right"><strong>${formatVND(comps.personalIncomeTax || 0)}</strong></td></tr>

      </tbody>
    </table>
  `;
}
// Kết thúc render chi tiết thuế
export function renderTotals(comps) {
  comps = comps || {};
  // Period
  const period = (comps.periodMonth && comps.periodYear) ? `${comps.periodMonth}/${comps.periodYear}` : '--/--';
  setText('displaySalaryPeriod', period);

  setText('displayEmpName', comps.empName || '--');
  setText('netSalary', formatVND(comps.netSalary || 0));

  // Hiên thị tổng lương
  setText('summaryTotalSalary', formatVND(comps.totalSalaryFromHours || 0));

  // totalIncome is gross overall (hours + allowances + possible fixed OT if included)
  setText('totalIncome', formatVND(comps.totalIncome || 0));
  setText('totalAllowance', formatVND(comps.totalAllowance || 0));
  setText('insuranceDeduction', formatVND(comps.insuranceDeduction || 0));
  setText('personalIncomeTax', formatVND(comps.personalIncomeTax || 0));

  // salaryDetail area
  const salaryBox = el('salaryDetail');
  if (salaryBox) salaryBox.innerHTML = renderSalaryDetailTable(comps);

  // allowance / bonus
  const allowanceBox = el('allowanceBonusDetail');
  if (allowanceBox) allowanceBox.innerHTML = renderAllowanceBonusTable(comps);

  // insurance detail
  const insuranceBox = el('insuranceDetail');
  if (insuranceBox) insuranceBox.innerHTML = renderInsuranceDetail(comps);

  // tax detail
  const taxBox = el('taxDetail');
  if (taxBox) taxBox.innerHTML = renderTaxDetail(comps);
}