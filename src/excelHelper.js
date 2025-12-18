'use strict';

import { SalaryModel } from './model.js';
import { formatVND } from './utils.js';

const HEADER_ROW_1 = [ 
    'PS-YYYY', 'PS-MM', 'PAY-YYYY', 'PAY-MM', 'PAY-DD', 'ID', 'HOTEN', 'HD-LOAI', 
    'WORK-STD', 'SAL-BASE', 'SAL-OT', 'SAL-ALL', 'SAL-CC', 'SAL-PLA', 'SAL-OTH', 'SAL-NONTAX', 
    'INS-YN', 'INS-PAY', 'INS-BASE', 'INS-TN', 
    'PIT-RANK', 'PIT-BAND', 'PIT-Duce', 
    'Hệ số lương', 'Hệ số lương', 'Hệ số lương', 'Hệ số lương', 'Hệ số lương', 'Hệ số lương', 'Hệ số lương' 
];

const HEADER_ROW_2 = [ 
    'Kỳ phát sinh (năm)', 'Kỳ phát sinh - tháng', 'Kỳ thanh toán (năm)', 'Kỳ thanh toán (tháng)', 'Kỳ thanh toán (ngày)', 'Mã nhân viên', 'Họ tên nhân viên', 'Loại hợp đồng lao động', 
    'Thời gian làm việc tiêu chuẩn', 'Mức lương cơ bản', 'Mức lương tính tiền lương tăng ca', 'Mức phụ cấp cơ bản', 'Mức phụ cấp chuyên cần', 'Mức lương ngày nghỉ kế hoạch', 'Thu nhập khác', 'TN Không chịu thuế (Ăn, Trang phục...)',
    'Có hoặc Không khấu trừ bảo hiểm', 'Bên chịu phần bảo hiểm 10.5%', 'Mức đóng bảo hiểm', 'Có tham gia bảo hiểm thất nghiệp hay không', 
    'Thuế TNCN: Cư trú hay không', 'Thuế TNCN: Kiểu khấu trừ', 'Số người phụ thuộc', 
    '1', '1.5', '2.1', '2', '2.7', '3', '3.9' 
];

const HEADER_ROW_3 = [ 
    'VD: 2025', 'VD: 12', 'VD: 2026', 'VD: 1', 'VD: 5', 'Bắt buộc', 'Bắt buộc', 'Chọn: Chính thức / Thử việc', 
    '48, 44 hoặc 40', 'VNĐ', 'VNĐ', 'VNĐ', 'VNĐ', 'VNĐ', 'VNĐ', 'VNĐ (Trừ trước khi tính thuế)',
    'Chọn: Có / Không', 'Chọn: NLĐ / Công ty', 'Lương đóng BHXH', 'Chọn: Có / Không', 
    'Chọn: Cư trú / Không cư trú', 'Chọn: LT (Lũy tiến), TP (10%), KCT (20%)', 'Số lượng', 
    'Giờ HC', 'Giờ TC Ngày', 'Giờ TC Đêm', 'Giờ CN', 'Giờ CN Đêm', 'Giờ Lễ', 'Giờ Lễ Đêm' 
];

const COL_NAMES = [];
for (let i = 0; i < 26; i++) COL_NAMES.push(String.fromCharCode(65 + i));
for (let i = 0; i < 10; i++) COL_NAMES.push('A' + String.fromCharCode(65 + i));

const CODE_MAP = {
    'PS-YYYY': 'periodYear', 'PS-MM': 'periodMonth', 
    'PAY-YYYY': 'paymentYear', 'PAY-MM': 'paymentMonth', 'PAY-DD': 'paymentDay',
    'ID': 'empCode', 'HOTEN': 'empName', 'WORK-STD': 'weeklyHours',
    'SAL-BASE': 'salaryForNormalHours', 'SAL-OT': 'salaryForOvertime',
    'SAL-ALL': 'allowanceSalary', 'SAL-CC': 'attendanceAllowanceBase', 
    'SAL-PLA': 'planLeaveSalary', 'SAL-OTH': 'otherTaxableIncome',
    'SAL-NONTAX': 'nonTaxableIncome', 
    'INS-BASE': 'socialSalary', 
    'HD-LOAI': 'contractType', 'INS-YN': 'insuranceEnabled', 'INS-PAY': 'insurancePayer',
    'INS-TN': 'unemploymentEnabled', 'PIT-RANK': 'isResident', 'PIT-BAND': 'taxMode', 'PIT-Duce': 'numDependents'
};

function parseBool(val) {
    if (!val) return false;
    const s = String(val).toLowerCase().trim();
    return (s.includes('có') || s.includes('yes') || s === '1' || s.includes('true') || s.includes('y') || s.includes('co'));
}

function validateRow(row, rowIndex, headerRow, titleRow) {
    const errors = [];
    const excelRow = rowIndex + 4; 

    const getIdx = (code) => headerRow.indexOf(code);

    const idxID = getIdx('ID');
    const idxName = getIdx('HOTEN');
    
    if (idxID === -1 || !row[idxID]) errors.push(`[Dòng ${excelRow}] Thiếu Mã Nhân viên (Cột ID).`);
    if (idxName === -1 || !row[idxName]) errors.push(`[Dòng ${excelRow}] Thiếu Họ tên Nhân viên (Cột HOTEN).`);

    const numericCodes = ['SAL-BASE', 'SAL-OT', 'SAL-ALL', 'SAL-CC', 'SAL-PLA', 'SAL-OTH', 'SAL-NONTAX', 'INS-BASE', 'PIT-Duce'];
    numericCodes.forEach(code => {
        const idx = getIdx(code);
        if (idx > -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
            if (isNaN(Number(row[idx]))) {
                errors.push(`[Dòng ${excelRow}, Cột ${COL_NAMES[idx] || code}] Giá trị "${row[idx]}" không phải là số.`);
            }
        }
    });

    const idxInsYn = getIdx('INS-YN');
    if (idxInsYn > -1 && row[idxInsYn]) {
        const val = String(row[idxInsYn]).toLowerCase();
        if (!['có', 'không', 'yes', 'no', '1', '0'].some(v => val.includes(v))) {
             errors.push(`[Dòng ${excelRow}, Cột ${COL_NAMES[idxInsYn] || 'INS-YN'}] Giá trị "${row[idxInsYn]}" không hợp lệ (Cần Có/Không).`);
        }
    }

    const idxPsMm = getIdx('PS-MM');
    if (idxPsMm > -1 && row[idxPsMm]) {
        const mm = Number(row[idxPsMm]);
        if (mm < 1 || mm > 12) errors.push(`[Dòng ${excelRow}, Cột PS-MM] Tháng phải từ 1-12.`);
    }

    const idxDuce = getIdx('PIT-Duce');
    if (idxDuce > -1 && row[idxDuce] !== undefined) {
        const num = Number(row[idxDuce]);
        if (num < 0) errors.push(`[Dòng ${excelRow}, Cột PIT-Duce] Số phụ thuộc không thể âm.`);
    }

    let totalOT = 0;
    if (titleRow) {
        titleRow.forEach((title, i) => {
            const v = Number(row[i]) || 0;
            const t = String(title).trim();
            if (['1.5', '2.1', '2', '2.7', '3', '3.9'].includes(t)) totalOT += v;
        });
    }
    if (totalOT > 200) errors.push(`[Dòng ${excelRow}] Tổng giờ OT vượt 200h/tháng.`);

    return errors;
}

export function generateTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([HEADER_ROW_1, HEADER_ROW_2, HEADER_ROW_3]);
    XLSX.utils.book_append_sheet(wb, ws, "Mau");
    XLSX.writeFile(wb, "MauLuong.xlsx");
}

export function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheet = workbook.SheetNames[0];
                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });

                if (rows.length < 3) throw new Error("File Excel thiếu dữ liệu header.");

                const fileHeaderRow = rows[0]; 
                const titleRow = rows[1]; 
                const dataRows = rows.slice(3);

                if (dataRows.length > 1000) console.warn('File lớn, có thể chậm');

                const validList = [];
                const allErrors = [];

                dataRows.forEach((r, idx) => {
                    if (!r || r.length === 0) return;

                    const rowErrors = validateRow(r, idx, fileHeaderRow, titleRow);
                    if (rowErrors.length > 0) {
                        allErrors.push(...rowErrors);
                        return;
                    }

                    const m = {};
                    
                    fileHeaderRow.forEach((code, i) => {
                        const key = CODE_MAP[code]; 
                        const val = r[i];
                        
                        if (key && val !== undefined) {
                            m[key] = val;
                        }

                        if (code === 'HD-LOAI') m.contractType = (String(val).toLowerCase().includes('thử việc') || String(val).toLowerCase().includes('probation')) ? 'probation' : 'official';
                        if (code === 'INS-YN') m.insuranceEnabled = parseBool(val); 
                        if (code === 'INS-PAY') m.insurancePayer = (String(val).toLowerCase().includes('công ty')) ? 'company' : 'employee';
                        if (code === 'INS-TN') m.unemploymentEnabled = parseBool(val);
                        if (code === 'PIT-RANK') m.isResident = !(String(val).toLowerCase().includes('không') || String(val).toLowerCase().includes('non') || String(val) === '0');
                        if (code === 'PIT-BAND') {
                            const s = String(val).toLowerCase();
                            if (s.includes('lt')) m.taxMode = 'progressive';
                            else if (s.includes('tp')) m.taxMode = 'flat_10';
                            else if (s.includes('kct')) m.taxMode = 'flat_20';
                            else m.taxMode = 'auto';
                        }
                    });

                    if (titleRow) {
                        titleRow.forEach((title, i) => {
                            const v = Number(r[i]) || 0;
                            const t = String(title).trim();
                            if (t === '1') m.day_norm_08_17 = v;
                            else if (t === '1.5') m.day_ot_17_20 = v;
                            else if (t === '2.1') m.day_ot_20_24 = v;
                            else if (t === '2') m.sunday_day_hours = v;
                            else if (t === '2.7') m.sunday_night_hours = v;
                            else if (t === '3') m.holidayDays = v / 8;
                            else if (t === '3.9') m.holidayNight = v / 8;
                        });
                    }
                    
                    if (!m.empName) m.empName = "Unknown";
                    validList.push(new SalaryModel(m));
                });

                if (allErrors.length > 0) {
                    reject({ isValidationError: true, messages: allErrors });
                } else {
                    resolve(validList);
                }
            } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
    });
}

export function exportResults(calculatedList) {
    const exportData = calculatedList.map(item => {
        const c = item.comps;
        const d = item.model;
        let taxStr = "Lũy tiến";
        if (d.taxMode === 'flat_20' || (!d.isResident)) taxStr = "KCT (20%)";
        else if (d.taxMode === 'flat_10') taxStr = "TP (10%)";

        return {
            'Mã NV': d.empCode, 'Họ Tên': d.empName, 'Loại HĐ': d.contractType==='official'?'Chính thức':'Thử việc',
            'Cư trú': d.isResident?'Có':'Không', 'Kiểu Thuế': taxStr,
            'Lương Gross': c.hourlyTotal, 'Tổng Phụ cấp': c.totalAllowance,
            'TN Không chịu thuế': d.nonTaxableIncome, 'TN Miễn thuế (OT)': c.taxFreeOvertime,
            'Tổng Thu nhập': c.totalIncome, 'BHXH (NV)': c.insuranceDeduction,
            'Thuế TNCN': c.personalIncomeTax, 'LƯƠNG NET': c.netSalary
        };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = Object.keys(exportData[0]).map(()=>({wch:18}));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KQ");
    XLSX.writeFile(wb, "KetQuaLuong.xlsx");
}