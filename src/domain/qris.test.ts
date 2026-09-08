import { describe, expect, it } from "vitest";
import { crc16Ccitt, makeDynamicQris, parseQrisTlv, validateQrisCrc } from "./qris";

describe("qris domain", () => {
  // Real sample of an Indonesian static QRIS payload base without CRC
  const sampleStaticQrisBase =
    "00020101021126600016ID.CO.TELKOMSEL.WWW011893600911000000000002081234567851440014ID.LINKAJA.WWW02159360091100000005204581253033605802ID5916TELKOMSEL KAMPUS6007JAKARTA61051234062070703A016304";
  const validCrc = crc16Ccitt(sampleStaticQrisBase);
  const sampleStaticQris = `${sampleStaticQrisBase}${validCrc}`;

  it("calculates correct CRC16 for known sample", () => {
    // "123456789" is the standard CRC-16 CCITT (false) test vector -> 0x29B1
    expect(crc16Ccitt("123456789")).toBe("29B1");
  });

  it("parses TLV correctly", () => {
    const tlvs = parseQrisTlv(sampleStaticQris);
    expect(tlvs.length).toBeGreaterThan(0);

    const tag00 = tlvs.find((t) => t.tag === "00");
    expect(tag00?.value).toBe("01");

    const tag01 = tlvs.find((t) => t.tag === "01");
    expect(tag01?.value).toBe("11"); // Static
  });

  it("validates valid QRIS CRC", () => {
    expect(validateQrisCrc(sampleStaticQris)).toBe(true);
    expect(validateQrisCrc(sampleStaticQris.slice(0, -1) + "0")).toBe(false);
  });

  it("converts static QRIS to dynamic QRIS with exact amount", () => {
    const dynamicQris = makeDynamicQris(sampleStaticQris, 100001);

    // Must be valid CRC
    expect(validateQrisCrc(dynamicQris)).toBe(true);

    // Parse result
    const tlvs = parseQrisTlv(dynamicQris);
    const tag01 = tlvs.find((t) => t.tag === "01");
    expect(tag01?.value).toBe("12"); // Now dynamic

    const tag54 = tlvs.find((t) => t.tag === "54");
    expect(tag54?.value).toBe("100001"); // Nominal included
    expect(tag54?.length).toBe(6);
  });

  it("replaces existing amount if already present", () => {
    const first = makeDynamicQris(sampleStaticQris, 50000);
    const second = makeDynamicQris(first, 75005);

    expect(validateQrisCrc(second)).toBe(true);
    const tlvs = parseQrisTlv(second);
    const amounts = tlvs.filter((t) => t.tag === "54");
    expect(amounts.length).toBe(1);
    expect(amounts[0]?.value).toBe("75005");
  });

  it("throws for empty payload", () => {
    expect(() => makeDynamicQris("", 100000)).toThrow();
  });
});
