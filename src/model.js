'use strict';

import { 
  STANDARD_MONTHLY_HOURS, RATE, INSURANCE_RATES, 
  PIT_RELIEF_RATES, PIT_BRACKETS, getMaxInsuranceBase 
} from './constants.js';
import { computeProgressiveTax } from './utils.js';

export class SalaryModel {
  constructor(data = {}) {
    this.data = data;
    this.comps = {};
    this.calculate();
  }

  static pickByDate(list, payDate) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const sorted = list.slice().sort((a,b) => b.effectiveDate - a.effectiveDate);
    for (const it of sorted) {
      if (payDate >= it.effectiveDate) return it;
    }
    return sorted[sorted.length - 1];
  }

  calculate() {
    const d = this.data || {};

    // --- Inputs
    const LCB = Number(d.salaryForNormalHours) || 0;         // Lương cơ bản (tháng)
    const PCB = Number(d.allowanceSalary) || 0;             // Phụ cấp cơ bản (tháng)
    const attendanceAllowanceBase = Number(d.attendanceAllowanceBase) || 0; // LCC (tháng)
    const otherTaxableIncome = Number(d.otherTaxableIncome) || 0; // PCK (tháng)
    const salaryForOvertime = (d.salaryForOvertime !== undefined) ? Number(d.salaryForOvertime) : LCB;
    const planLeaveSalaryVal = Number(d.planLeaveSalary) || 0;

    const standardHours = Number(d.standardHours) || STANDARD_MONTHLY_HOURS;
    const hourlyBaseRate = standardHours > 0 ? (LCB / standardHours) : 0; // LCB/208
    const pcbPerHour = standardHours > 0 ? (PCB / standardHours) : 0;     // PCB/208

    // --- Hours
    const hours = {
      h_norm_day: Number(d.h_norm_day) || 0,
      h_norm_break: Number(d.h_norm_break) || 0,
      h_norm_ot_150: Number(d.h_norm_ot_150) || 0,
      h_norm_ot_210: Number(d.h_norm_ot_210) || 0,

      h_night_100: Number(d.h_night_100) || 0,
      h_night_130: Number(d.h_night_130) || 0,
      h_night_break: Number(d.h_night_break) || 0,
      h_night_ot_200: Number(d.h_night_ot_200) || 0,
      h_night_ot_150: Number(d.h_night_ot_150) || 0,

      h_sun_day: Number(d.h_sun_day) || 0,
      h_sun_night_270: Number(d.h_sun_night_270) || 0,
      h_sun_night_200: Number(d.h_sun_night_200) || 0,

      h_hol_day: Number(d.h_hol_day) || 0,
      h_hol_night: Number(d.h_hol_night) || 0,
      h_hol_ot_300: Number(d.h_hol_ot_300) || 0
    };

    // Convert holidayDays (days) -> hours (8h/day)
    let holidayDays = Number(d.holidayDays) || 0;
    if (holidayDays > 0) {
      hours.h_hol_day += holidayDays * 8;
    }

    // Cải tiến: Auto holidayDays nếu không input (placeholder, có thể extend với holiday API)
    if (holidayDays === 0) {
      // Ví dụ đơn giản: Tháng 4 có 2 ngày lễ (Giỗ Tổ, 30/4), nhưng cần full list
      const month = Number(d.periodMonth) || new Date().getMonth() + 1;
      if (month === 4) holidayDays = 2; // Example
      // Thêm logic full cho các tháng khác
    }

    // Tính lương từ giờ
    const salaryFromNonHoliday = (
      hours.h_norm_day * RATE.NORMAL_DAY_100 +
      hours.h_norm_break * RATE.NORMAL_DAY_BREAK_100 +
      hours.h_norm_ot_150 * RATE.NORMAL_DAY_OT_150 +
      hours.h_norm_ot_210 * RATE.NORMAL_DAY_OT_210 +
      hours.h_night_100 * RATE.NORMAL_NIGHT_100 +
      hours.h_night_130 * RATE.NORMAL_NIGHT_130 +
      hours.h_night_break * RATE.NORMAL_NIGHT_BREAK_130 +
      hours.h_night_ot_200 * RATE.NORMAL_NIGHT_OT_200 +
      hours.h_night_ot_150 * RATE.NORMAL_NIGHT_OT_150 +
      hours.h_sun_day * RATE.SUNDAY_DAY_200 +
      hours.h_sun_night_270 * RATE.SUNDAY_NIGHT_270 +
      hours.h_sun_night_200 * RATE.SUNDAY_NIGHT_200
    ) * hourlyBaseRate;

    const salaryFromHoliday = (
      hours.h_hol_day * RATE.HOLIDAY_DAY +
      hours.h_hol_night * RATE.HOLIDAY_NIGHT +
      hours.h_hol_ot_300 * RATE.HOLIDAY_DAY_OT
    ) * hourlyBaseRate;

    const paidLeaveDays = Number(d.paidLeaveDays) || 0;
    const companyLeaveDays = Number(d.companyLeaveDays) || 0;

    const paidLeavePay = paidLeaveDays * (LCB / 26); // Assume 26 working days
    const companyLeavePay = companyLeaveDays * planLeaveSalaryVal;

    const totalSalaryFromHours = Math.round(salaryFromNonHoliday + salaryFromHoliday + paidLeavePay + companyLeavePay);

    // Phụ cấp
    const totalNormalHours = hours.h_norm_day + hours.h_norm_break + hours.h_night_100 + hours.h_night_130 + hours.h_night_break + hours.h_sun_day; // Normal non-OT
    const totalAllowanceFromHours = Math.round(pcbPerHour * totalNormalHours);

    const totalAllowance = totalAllowanceFromHours + attendanceAllowanceBase;

    const otherTaxableIncomeInPeriod = Number(d.otherTaxableIncomeInPeriod) || 0;
    const totalIncome = totalSalaryFromHours + totalAllowance + otherTaxableIncome + otherTaxableIncomeInPeriod;

    // Ngày thanh toán
    const payDay = Number(d.payDay) || 1;
    const payMonth = Number(d.payMonth) || 1;
    const payYear = Number(d.payYear) || new Date().getFullYear();
    const payDate = new Date(payYear, payMonth - 1, payDay);

    // Cải tiến: daysWithPayApprox chỉ dùng normal non-OT hours
    const normalNonOtHours = hours.h_norm_day + hours.h_norm_break + hours.h_night_100 + hours.h_night_130 + hours.h_night_break + hours.h_sun_day;
    const daysWithPayApprox = (normalNonOtHours / 8) + paidLeaveDays + holidayDays;
    
    
    // --- 6. INSURANCE CALCULATION (Updated Logic)
// A. Tổng hợp ngày công
    const actualWorkHours = 
        (hours.h_norm_day || 0) +
        (hours.h_night_100 || 0) + (hours.h_night_130 || 0);
        
    const convertedWorkDays = actualWorkHours / 8; 
    const totalPaidDaysForInsurance = convertedWorkDays + paidLeaveDays + holidayDays;

    // B. Chuẩn hóa Input (Mapping từ Controller/View)
    // Lưu ý: Kiểm tra kỹ tên biến từ HTML (insuranceEnabled / unemploymentEnabled)
    const input_isBHXH = (d.isBHXH === '1' || d.isBHXH === true);
    const input_isBHTN = (d.isBHTN === '1' || d.isBHTN === true);
    const contractType = d.contractType || 'official';

    // C. Logic xác định đối tượng đóng BHXH (BHXH + BHYT)
    let mustpayBHXH = false;

    if (contractType === 'probation') {
        mustpayBHXH = false; // Thử việc -> Không
    } else if (!input_isBHXH) {
        mustpayBHXH = false; // Người dùng tắt BHXH -> Không
    } else {
        // Chính thức + Có bật BHXH -> Xét 14 ngày
        mustpayBHXH = (totalPaidDaysForInsurance >= 14);
    }

    // D. Logic xác định đối tượng đóng BHTN
    // Điều kiện: Phải đang đóng BHXH + Có bật BHTN + Đủ 14 ngày (đã nằm trong mustpayBHXH)
    let mustpayBHTN = false;

    if (!mustpayBHXH) {
        mustpayBHTN = false; // Không đóng BHXH thì chắc chắn không đóng BHTN
    } else {
        // Đã đủ điều kiện BHXH -> Chỉ cần xem người dùng có bật BHTN không
        mustpayBHTN = input_isBHTN;
    }

    // E. Tính toán tiền
    const socialSalary = Number(d.socialSalary) || LCB;
    const maxInsBase = 46800000; // 20 * 2.34tr
    const cappedBase = Math.min(socialSalary, maxInsBase);

    let payBHXH = 0; // Tiền BHXH + BHYT
    let payBHTN = 0; // Tiền BHTN

    // Lưu ý: Dùng đúng tên key trong constants.js (SOCIAL, HEALTH, UNEMPLOYMENT)
    if (mustpayBHXH) {
        payBHXH = cappedBase * (INSURANCE_RATES.BHXH + INSURANCE_RATES.BHYT);
    }

    if (mustpayBHTN) {
        payBHTN = cappedBase * INSURANCE_RATES.BHTN;
    }
    
    // Tổng khấu trừ cuối cùng
    const insuranceDeduction = payBHXH + payBHTN;

    
 // Kết thúc tính bảo hiểm   

    // --- Reliefs & Taxable
    const reliefObj = SalaryModel.pickByDate(PIT_RELIEF_RATES, payDate) || { personal: 0, dependent: 0 };
    const personalRelief = reliefObj.personal || 0;
    const numDependents = Number(d.numDependents_tax || d.numDependents || 0) || 0;
    const dependentRelief = (reliefObj.dependent || 0) * numDependents;

    const taxFreeIncome = Number(d.taxFreeIncome) || 0;
    const nonTaxableIncome = Number(d.nonTaxableIncome) || 0;

    let taxtotalReduction = personalRelief + dependentRelief + insuranceDeduction;
    let taxableIncome = Math.max(0, totalIncome - insuranceDeduction - personalRelief - dependentRelief - taxFreeIncome - nonTaxableIncome);

    const bracketObj = SalaryModel.pickByDate(PIT_BRACKETS, payDate) || PIT_BRACKETS[PIT_BRACKETS.length - 1];
    const brackets = bracketObj && bracketObj.brackets ? bracketObj.brackets : bracketObj;

    const taxMode = d.taxMode || 'progressive';
    let personalIncomeTax = 0;
    if (String(d.isResident) === '0') {
      personalIncomeTax = pitTNCT * 0.2; // Cá nhân không cư trú = 20% * thu nhập chịu thuế
    } else if (taxMode === 'flat_10') {
      personalIncomeTax = Math.round(totalIncome * 0.10);  // Hợp đồng thử việc = 10% * tổng thu nhập
    } else {
      personalIncomeTax = Math.round(computeProgressiveTax(taxableIncome, brackets || []));
    }

    const netSalary = Math.round(totalIncome + nonTaxableIncome + taxFreeIncome - insuranceDeduction - personalIncomeTax);

    // Trả kết quả sang view để render
    this.comps = {
      empName: d.empName || '',
      empCode: d.empCode || '',
      periodMonth: d.periodMonth || '',
      periodYear: d.periodYear || '',
      payDate: payDate.toISOString(),

      hourlyRate: hourlyBaseRate,
      baseSalaryMonthly: LCB,
      pcbMonthly: PCB,

      salaryFromNonHoliday,
      salaryFromHoliday,
      paidLeavePay,
      companyLeavePay,
      totalSalaryFromHours,
      totalAllowanceFromHours,
      attendanceAllowanceBase,
      totalAllowance,
      otherTaxableIncome,
      salaryForOvertime,
      planLeaveSalary: planLeaveSalaryVal,

      totalIncome,
      cappedBase,
      mustpayBHXH,
      mustpayBHTN,
      days: totalPaidDaysForInsurance,
      payBHXH,
      payBHTN,
      total: insuranceDeduction,
      insuranceRates: INSURANCE_RATES,
      insuranceDeduction: insuranceDeduction,

      personalIncomeTax,
      taxableIncome,
      taxtotalReduction,

      taxMode,
      taxNote: d.taxNote || '',

      netSalary,

      details: {
        hours,
        holidayHoursTotal: holidayDays * 8,
        daysWithPayApprox,
        otHoursSum: Object.values(hours).reduce((a, b) => a + b, 0) - normalNonOtHours,
        
        tax: {
          taxableIncome,
          assessableIncome: taxableIncome,
          method: taxMode
        },
        relief: {
          personalRelief,
          dependentRelief
        }
      }
    };

    return this.comps;
  }
}