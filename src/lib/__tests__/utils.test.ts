import { describe, it, expect, vi } from "vitest";
import { cn, formatMoney, formatNumber, formatDate, generateSaleNumber } from "../utils";

describe("cn (class name merger)", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges tailwind conflicts correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });
});

describe("formatMoney", () => {
  it("formats number as Thai baht", () => {
    const result = formatMoney(1000);
    // Should contain the currency symbol and formatted number
    expect(result).toContain("1,000");
  });

  it("formats zero", () => {
    const result = formatMoney(0);
    expect(result).toContain("0");
  });

  it("formats string input", () => {
    const result = formatMoney("250.50");
    expect(result).toContain("250.50");
  });

  it("handles NaN gracefully", () => {
    const result = formatMoney("not a number");
    expect(result).toContain("0");
  });

  it("handles negative numbers", () => {
    const result = formatMoney(-500);
    expect(result).toContain("500");
  });

  it("limits to 2 decimal places", () => {
    const result = formatMoney(10.999);
    // Should round or truncate to 2 decimal
    expect(result).toMatch(/11\.00|10\.99|11/);
  });
});

describe("formatNumber", () => {
  it("formats with thousand separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("formats string input", () => {
    expect(formatNumber("99999")).toBe("99,999");
  });

  it("handles NaN", () => {
    expect(formatNumber("abc")).toBe("0");
  });
});

describe("formatDate", () => {
  it("formats Date object", () => {
    const d = new Date("2024-03-15T14:30:00Z");
    const result = formatDate(d);
    expect(result).toContain("15");
    expect(result).toContain("03");
    expect(result).toContain("2024");
  });

  it("formats ISO string", () => {
    const result = formatDate("2024-12-25T10:00:00Z");
    expect(result).toContain("25");
    expect(result).toContain("12");
    expect(result).toContain("2024");
  });

  it("includes time", () => {
    const result = formatDate("2024-06-01T08:15:00Z");
    // The en-GB format includes hours and minutes
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe("generateSaleNumber", () => {
  it("starts with S", () => {
    const num = generateSaleNumber();
    expect(num).toMatch(/^S/);
  });

  it("has correct format S{YY}{MM}{DD}-{XXXX}", () => {
    const num = generateSaleNumber();
    expect(num).toMatch(/^S\d{6}-\d{4}$/);
  });

  it("uses current date", () => {
    const num = generateSaleNumber();
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    expect(num).toContain(`S${y}${m}${d}`);
  });

  it("generates unique numbers", () => {
    const numbers = new Set(Array.from({ length: 50 }, () => generateSaleNumber()));
    // With 4-digit random (1000-9999), 50 numbers should almost certainly be unique
    expect(numbers.size).toBeGreaterThanOrEqual(40);
  });

  it("random part is 4 digits between 1000-9999", () => {
    for (let i = 0; i < 20; i++) {
      const num = generateSaleNumber();
      const rnd = parseInt(num.split("-")[1], 10);
      expect(rnd).toBeGreaterThanOrEqual(1000);
      expect(rnd).toBeLessThanOrEqual(9999);
    }
  });
});
