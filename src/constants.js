'use strict';

export const STANDARD_MONTHLY_HOURS = 208; // 26 ngày công chuẩn

// CẤU HÌNH HỆ SỐ LƯƠNG
export const RATE = {
    // 1. Hệ số lương Giờ hành chính/ Ca ngày
    NORMAL_DAY_100: 1.0,    // Hệ số 100%; Giờ làm việc ngày bình thường từ 08:00-12:00, 13:00-17:00       
    NORMAL_DAY_BREAK_100: 1.0,  // Hệ số 100%; Giờ nghỉ giữa trưa (12:00-13:00) ca ngày   
    NORMAL_DAY_OT_150: 1.5,  // Hệ số 150%; Giờ tăng ca ca ngày/hành chính ngày bình thương từ 17:00-20:00         
    NORMAL_DAY_OT_210: 2.1,  // Hệ số 210%; Giờ tăng ca ca ngày/hành chính ngày bình thương từ 20:00-22:00        

    // 2. Hệ số lương Ca đêm
    NORMAL_NIGHT_100: 1.0,  // Hệ số 100%; Giờ làm việc ca đêm từ 20:00-22:00       
    NORMAL_NIGHT_130: 1.3,  // Hệ số 130%; Giờ làm việc ca đêm từ 22:00-24:00 và từ 01:00-05:00       
    NORMAL_NIGHT_BREAK_130: 1.3,  // Hệ số 130%; Giờ làm việc giữa ca ca đêm từ 00:00-01:00 
    NORMAL_NIGHT_OT_150: 1.5,  // Hệ số 150%; Giờ làm việc ca đêm từ 06:00-08:00    
    NORMAL_NIGHT_OT_200: 2.0,  // Hệ số 200%; Giờ tăng ca ca đêm từ 05:00-06:00    

    // 3. Tăng ca ngày nghỉ (Chủ nhật)
    SUNDAY_DAY_200: 2.0, // 200% Giờ làm việc hành chính/ ca ngày chủ nhật (từ 18:00-12:00 và từ 13:00-17:00)    
    SUNDAY_DAY_BREAK_200: 2.0, // 200% Tăng ca ngày chủ nhật (từ 12:00-13:00)
    SUNDAY_DAY_OT_200: 2.0, // 200% Tăng ca ngày chủ nhật (từ 17:00-20:00)     
    SUNDAY_NIGHT_200: 2.0,  // 200% Tăng ca ngày chủ nhật (từ 20:00-22:00) 
    SUNDAY_NIGHT_270: 2.7,  // 270% Tăng ca ngày chủ nhật (từ 22:00-24:00 và từ 01:00-05:00)   
    SUNDAY_NIGHT_270_BREAK: 2.7,   // 270% Tăng ca ngày chủ nhật (từ 00:00-01:00)
    
    // 4. Đi làm Ngày lễ/ Tết
    HOLIDAY_DAY: 3.0,  // 300% Giờ làm việc hành chính/ ca ngày lễ/ tết (từ 08:00-12:00, 13:00-17:00)         
    HOLIDAY_DAY_BREAK: 3.0,  // 300% Giờ làm việc nghỉ trưa làm ngày lễ/ tết (từ 12:00-13:00)   
    HOLIDAY_DAY_OT: 3.0, // 300% Tăng ca ngày lễ/ tết (từ 17:00-20:00)     
    HOLIDAY_NIGHT: 3.0,  // 300% Giờ làm việc ca đêm lễ/ tết (từ 20:00-22:00)     
    HOLIDAY_NIGHT_390: 3.9,  // 390% Giờ làm việc ca đêm lễ/ tết (từ 22:00-24:00 và từ 01:00-05:00)   
    HOLIDAY_NIGHT_390_BREAK: 3.9, // 390% Giờ làm việc giữa ca ca đêm lễ/ tết (từ 00:00-01:00)   
    HOLIDAY_NIGHT_OT: 3.0, //   300% Tăng ca ca đêm lễ/ tết (từ 06:00-08:00)     
};

// Tỷ lệ Bảo hiểm (Khóa dạng chuỗi để dùng mã tài khoản)
export const INSURANCE_RATES = {
  'BHXH': 0.08,     // BHXH
  'BHYT': 0.015,    // BHYT
  'BHTN': 0.01      // BHTN
};

export function getMaxInsuranceBase(y, m, d) {
    const date = new Date(y, m - 1, d);
    if (date >= new Date(2024, 6, 1)) return 2340000 * 20; 
    return 1800000 * 20; 
}

// Biểu giảm trừ gia cảnh (Sắp xếp từ mới nhất -> cũ nhất)
export const PIT_RELIEF_RATES = [
    { effectiveDate: new Date(2026, 0, 1), personal: 15500000, dependent: 6200000 }, // áp dụng từ 01/01/2026
    { effectiveDate: new Date(2020, 6, 1), personal: 11000000, dependent: 4400000 }  // áp dụng từ 01/07/2020
];

export const PIT_NON_RESIDEN = 0.20; 
export const PIT_TP = 0.10; 

// Biểu thuế lũy tiến từng phần
export const PIT_BRACKETS = [
    { 
        effectiveDate: new Date(2026, 6, 1),  // áp dụng từ 01/07/2026
        brackets: [
            { limit: 10000000, rate: 0.05 }, { limit: 30000000, rate: 0.10 },
            { limit: 60000000, rate: 0.20 }, { limit: 100000000, rate: 0.30 },
            { limit: Infinity, rate: 0.35 }
        ]
    },
    { 
        effectiveDate: new Date(2009, 0, 1),  // áp dụng từ 01/01/2009
        brackets: [
            { limit: 5000000, rate: 0.05 }, { limit: 10000000, rate: 0.10 },
            { limit: 18000000, rate: 0.15 }, { limit: 32000000, rate: 0.20 },
            { limit: 52000000, rate: 0.25 }, { limit: 80000000, rate: 0.30 },
            { limit: Infinity, rate: 0.35 }
        ]
    }
];