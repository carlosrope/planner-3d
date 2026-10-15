import { describe, expect, it } from "vitest";
import { TRASH_DAYS, trashDaysLeft, trashPurgeAt } from "./domain";

describe("papelera", () => {
  const deleted = new Date("2026-10-15T12:00:00Z");
  it("se borra de verdad 30 días después", () => {
    expect(TRASH_DAYS).toBe(30);
    expect(trashPurgeAt(deleted).toISOString()).toBe("2026-11-14T12:00:00.000Z");
  });
  it("cuenta los días que le quedan y no baja de cero", () => {
    expect(trashDaysLeft(deleted, deleted)).toBe(30);
    expect(trashDaysLeft(deleted, new Date("2026-11-13T12:00:00Z"))).toBe(1);
    expect(trashDaysLeft(deleted, new Date("2026-12-01T00:00:00Z"))).toBe(0);
  });
});
