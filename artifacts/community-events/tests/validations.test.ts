import { describe, expect, it } from "vitest";
import {
  cardDesignSchema,
  categorySchema,
  credentialsSchema,
  eventInputSchema,
  eventUpdateSchema,
  favouritesSchema,
  httpImageSchema,
  normalizeCity,
  passwordSchema,
  querySchema,
} from "@/lib/validations";

describe("normalizeCity", () => {
  it("trims and collapses internal whitespace", () => {
    expect(normalizeCity("  New   Delhi ")).toBe("New Delhi");
  });

  it("leaves an already clean value untouched", () => {
    expect(normalizeCity("Chennai")).toBe("Chennai");
  });
});

describe("passwordSchema", () => {
  it("rejects passwords shorter than ten characters", () => {
    expect(passwordSchema.safeParse("short9cha").success).toBe(false);
  });

  it("accepts exactly ten characters", () => {
    expect(passwordSchema.safeParse("0123456789").success).toBe(true);
  });

  it("rejects passwords longer than 72 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });

  it("counts UTF-8 bytes rather than characters for the bcrypt limit", () => {
    // Ten emoji are 40 UTF-8 bytes but only 20 UTF-16 code units, and the
    // ceiling is on bytes, so a multi-byte password must still be rejected.
    const multibyte = "\u{1F600}".repeat(19);
    expect(multibyte.length).toBeLessThanOrEqual(72);
    expect(passwordSchema.safeParse(multibyte).success).toBe(false);
  });
});

describe("credentialsSchema", () => {
  it("normalises email casing and surrounding whitespace", () => {
    const result = credentialsSchema.parse({ email: "  Visitor@Example.COM ", password: "correct horse" });
    expect(result.email).toBe("visitor@example.com");
  });

  it("rejects unknown properties", () => {
    expect(credentialsSchema.safeParse({ email: "a@b.com", password: "correct horse", role: "ADMIN" }).success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("accepts every documented category", () => {
    for (const category of ["MUSIC", "WORKSHOP", "FOOD", "SPORTS", "KIDS"]) {
      expect(categorySchema.safeParse(category).success).toBe(true);
    }
  });

  it("rejects an unknown category", () => {
    expect(categorySchema.safeParse("DANCE").success).toBe(false);
  });
});

describe("favouritesSchema", () => {
  it("accepts a valid subset", () => {
    expect(favouritesSchema.safeParse({ categories: ["MUSIC", "FOOD"] }).success).toBe(true);
  });

  it("rejects duplicate categories", () => {
    expect(favouritesSchema.safeParse({ categories: ["MUSIC", "MUSIC"] }).success).toBe(false);
  });

  it("rejects more than five categories", () => {
    expect(favouritesSchema.safeParse({ categories: ["MUSIC", "WORKSHOP", "FOOD", "SPORTS", "KIDS", "MUSIC"] }).success).toBe(false);
  });
});

describe("cardDesignSchema", () => {
  it("accepts a theme with up to three unique stickers", () => {
    expect(cardDesignSchema.safeParse({ theme: "warm-atelier", stickers: ["vinyl", "spark"] }).success).toBe(true);
  });

  it("rejects a fourth sticker", () => {
    expect(cardDesignSchema.safeParse({ theme: "warm-atelier", stickers: ["vinyl", "spark", "flower", "ticket"] }).success).toBe(false);
  });

  it("rejects an unknown theme", () => {
    expect(cardDesignSchema.safeParse({ theme: "neon", stickers: [] }).success).toBe(false);
  });
});

describe("httpImageSchema", () => {
  it("accepts a public https URL", () => {
    expect(httpImageSchema.safeParse("https://images.example.com/a.jpg").success).toBe(true);
  });

  it("rejects embedded credentials", () => {
    expect(httpImageSchema.safeParse("https://user:pass@example.com/a.jpg").success).toBe(false);
  });

  it("rejects a non-http protocol", () => {
    expect(httpImageSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("querySchema", () => {
  it("applies documented pagination defaults", () => {
    const parsed = querySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(9);
  });

  it("coerces numeric strings from the query string", () => {
    const parsed = querySchema.parse({ page: "3", pageSize: "12" });
    expect(parsed).toMatchObject({ page: 3, pageSize: 12 });
  });

  it("caps pageSize at the documented maximum", () => {
    expect(querySchema.safeParse({ pageSize: "31" }).success).toBe(false);
  });
});

describe("eventInputSchema", () => {
  const valid = {
    title: "Rooftop Jazz & Soul",
    category: "MUSIC",
    city: "Bengaluru",
    startsAt: "2026-12-01T13:00:00.000Z",
    price: "850",
    description: "An intimate evening of live jazz with warm lights and city views.",
  };

  it("defaults isActive to true when omitted", () => {
    expect(eventInputSchema.parse(valid).isActive).toBe(true);
  });

  it("normalises the city before validating its length", () => {
    expect(eventInputSchema.parse({ ...valid, city: "  New   Delhi " }).city).toBe("New Delhi");
  });

  it("rejects a negative price", () => {
    expect(eventInputSchema.safeParse({ ...valid, price: "-1" }).success).toBe(false);
  });

  it("rejects a price with more than two decimal places", () => {
    expect(eventInputSchema.safeParse({ ...valid, price: "10.005" }).success).toBe(false);
  });

  it("rejects a title shorter than three characters", () => {
    expect(eventInputSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
  });

  it("rejects a description shorter than ten characters", () => {
    expect(eventInputSchema.safeParse({ ...valid, description: "short" }).success).toBe(false);
  });

  it("requires an offset on the startsAt timestamp", () => {
    expect(eventInputSchema.safeParse({ ...valid, startsAt: "2026-12-01T13:00:00" }).success).toBe(false);
  });
});

describe("eventUpdateSchema", () => {
  it("accepts a partial change", () => {
    expect(eventUpdateSchema.safeParse({ title: "Updated title" }).success).toBe(true);
  });

  it("rejects an update carrying no changed field", () => {
    expect(eventUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("treats a lone updatedAt as not a real change", () => {
    expect(eventUpdateSchema.safeParse({ updatedAt: "2026-12-01T13:00:00.000Z" }).success).toBe(false);
  });
});