import { createHash } from 'crypto';

/**
 * Fingerprint chống trùng lặp LIÊN KÊNH (email + SePay) cho cùng 1 giao dịch.
 * Hai kênh thấy cùng nội dung + số tiền + ngày → cùng fingerprint → kênh đến
 * sau tự bỏ qua, không kích hoạt trùng.
 */
export function normalizeTxContent(content: string): string {
  return content.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function buildTxFingerprint(opts: {
  content: string;
  amount: number;
  transferTime?: Date | null;
}): string {
  const day = opts.transferTime && !isNaN(opts.transferTime.getTime())
    ? opts.transferTime.toISOString().slice(0, 10)
    : 'nodate';
  return createHash('sha256')
    .update(`${normalizeTxContent(opts.content)}|${Number(opts.amount)}|${day}`)
    .digest('hex');
}

/** Các trạng thái coi như "đã có người xử lý" — kênh đến sau bỏ qua. */
export const TX_FINAL_STATES = ['PROCESSED', 'PROCESSING'];
