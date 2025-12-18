'use strict';

// DOM helpers
export function el(id) {
  return document.getElementById(id);
}

export function setText(id, txt) {
  const node = el(id);
  if (!node) return;
  node.textContent = txt;
}

// Format tiền VNĐ
export function formatVND(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('vi-VN') + ' VND';
}

// Parse number with safe fallback and clamp negative -> 0
export function parseNum(v, fallback = 0) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = Number(v);
  if (!isFinite(n)) return fallback;
  return n < 0 ? 0 : n;
}

// Lấy giá trị số từ input theo id (an toàn)
export function getInputNumber(id, fallback = 0) {
  const elNode = document.getElementById(id);
  if (!elNode) return fallback;
  return parseNum(elNode.value, fallback);
}

// debounce
export function debounce(fn, wait = 200) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Compute progressive tax from brackets
// brackets: [{limit, rate}, ...] sorted ascending by limit
export function computeProgressiveTax(amount, brackets) {
  let remaining = amount;
  let tax = 0;
  let prevLimit = 0;
  for (const b of brackets) {
    const limit = b.limit === Infinity ? Infinity : b.limit;
    const sliceLimit = (limit === Infinity) ? remaining : (limit - prevLimit);
    const taxableSlice = Math.max(0, Math.min(remaining, sliceLimit));
    if (taxableSlice > 0) {
      tax += taxableSlice * b.rate;
      remaining -= taxableSlice;
    }
    prevLimit = limit === Infinity ? prevLimit : limit;
    if (remaining <= 0) break;
  }
  return tax;
}