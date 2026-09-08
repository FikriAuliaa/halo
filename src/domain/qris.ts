/**
 * EMVCo / QRIS (Quick Response Code Indonesian Standard) domain utility.
 *
 * Implements standard EMVCo Tag-Length-Value (TLV) parsing and generation,
 * with CRC-16/CCITT-FALSE checksum recalculation.
 *
 * Used to convert a static QRIS payload (Tag 01 = "11") into a dynamic
 * QRIS payload (Tag 01 = "12") with an exact transaction amount (Tag 54).
 */

export interface QrisTlv {
  tag: string;
  length: number;
  value: string;
}

/**
 * Calculates CRC-16/CCITT-FALSE (Polynomial 0x1021, Initial 0xFFFF).
 * Standard CRC algorithm defined by EMVCo / Bank Indonesia QRIS specifications.
 */
export function crc16Ccitt(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i);
    crc ^= (byte & 0xff) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Parses an EMVCo QR string into a list of TLV (Tag-Length-Value) entries.
 */
export function parseQrisTlv(payload: string): QrisTlv[] {
  const result: QrisTlv[] = [];
  let index = 0;

  while (index < payload.length) {
    if (index + 4 > payload.length) break;

    const tag = payload.slice(index, index + 2);
    const lengthStr = payload.slice(index + 2, index + 4);
    const length = Number.parseInt(lengthStr, 10);

    if (Number.isNaN(length) || length < 0) break;

    const valStart = index + 4;
    const valEnd = valStart + length;

    if (valEnd > payload.length) break;

    const value = payload.slice(valStart, valEnd);
    result.push({ tag, length, value });

    index = valEnd;
  }

  return result;
}

/**
 * Validates the CRC16 of a QRIS payload string.
 */
export function validateQrisCrc(payload: string): boolean {
  if (!payload || payload.length < 8) return false;

  const crcTagIndex = payload.lastIndexOf("6304");
  if (crcTagIndex === -1 || crcTagIndex !== payload.length - 8) return false;

  const dataToVerify = payload.slice(0, crcTagIndex + 4);
  const expectedCrc = payload.slice(crcTagIndex + 4);

  return crc16Ccitt(dataToVerify) === expectedCrc.toUpperCase();
}

/**
 * Converts a static QRIS string into a dynamic QRIS string with the specified nominal amount.
 *
 * 1. Changes Tag 01 (Point of Initiation Method) from '11' (static) to '12' (dynamic).
 * 2. Adds or updates Tag 54 (Transaction Amount) with the specified amount (e.g. 100001).
 * 3. Recalculates Tag 63 (CRC-16) and appends the new valid checksum.
 */
export function makeDynamicQris(rawStaticPayload: string, amount: number): string {
  const trimmed = rawStaticPayload.trim();
  if (!trimmed) {
    throw new Error("Payload QRIS tidak boleh kosong.");
  }

  const tlvs = parseQrisTlv(trimmed);
  if (tlvs.length === 0) {
    throw new Error("Payload QRIS tidak valid: format EMVCo tidak terdeteksi.");
  }

  // Filter out existing CRC (tag 63)
  const filtered = tlvs.filter((t) => t.tag !== "63");

  // Ensure Tag 01 is '12' (Dynamic)
  const tag01 = filtered.find((t) => t.tag === "01");
  if (tag01) {
    tag01.value = "12";
    tag01.length = 2;
  } else {
    filtered.unshift({ tag: "01", length: 2, value: "12" });
  }

  // Format amount as an integer string (or 2 decimal places if needed, QRIS IDR standard is integer)
  const amountStr = Math.round(amount).toString();
  const tag54Index = filtered.findIndex((t) => t.tag === "54");

  if (tag54Index >= 0) {
    filtered[tag54Index] = { tag: "54", length: amountStr.length, value: amountStr };
  } else {
    // Insert tag 54 right after tag 53 (Currency), or before tag 58 (Country Code)
    const tag53Index = filtered.findIndex((t) => t.tag === "53");
    const insertAt = tag53Index >= 0 ? tag53Index + 1 : filtered.length;
    filtered.splice(insertAt, 0, {
      tag: "54",
      length: amountStr.length,
      value: amountStr,
    });
  }

  // Reassemble the TLV string without CRC
  let rawWithoutCrc = "";
  for (const item of filtered) {
    const lenStr = item.length.toString().padStart(2, "0");
    rawWithoutCrc += `${item.tag}${lenStr}${item.value}`;
  }

  // Append '6304' and calculate CRC
  const toCrc = `${rawWithoutCrc}6304`;
  const checksum = crc16Ccitt(toCrc);

  return `${toCrc}${checksum}`;
}
