import { describe, expect, it } from "vitest";
import { isValidEmail } from "@/lib/leadCapture";

describe("leadCapture email", () => {
  it("accepts normal emails", () => {
    expect(isValidEmail("user@nerdcommand.com")).toBe(true);
    expect(isValidEmail("  a.b+1@x.co  ")).toBe(true);
  });
  it("rejects bad emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@x.com")).toBe(false);
  });
});
