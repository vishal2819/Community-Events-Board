import { describe, expect, it } from "vitest";
import type { Category, Event } from "@prisma/client";
import { eventDto, publicWhere, type EventQuery } from "@/lib/services/events";
import { querySchema } from "@/lib/validations";

const NOW = new Date("2026-10-12T12:00:00.000Z");

function query(overrides: Record<string, string> = {}): EventQuery {
  return querySchema.parse(overrides);
}

const sample = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Rooftop Jazz & Soul",
  category: "MUSIC",
  city: "Bengaluru",
  startsAt: new Date("2026-11-01T13:00:00.000Z"),
  price: { toFixed: () => "850.00" },
  description: "An intimate evening of live jazz.",
  imageUrl: "https://images.example.com/a.jpg",
  isActive: true,
  createdAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-02T00:00:00.000Z"),
} as unknown as Event;

describe("publicWhere", () => {
  it("always restricts to active, upcoming events", () => {
    const where = publicWhere(query(), NOW);
    expect(where).toMatchObject({ isActive: true, startsAt: { gt: NOW } });
  });

  it("filters by a single category", () => {
    expect(publicWhere(query({ category: "MUSIC" }), NOW)).toMatchObject({ category: "MUSIC" });
  });

  it("filters by saved categories when no explicit category is chosen", () => {
    const where = publicWhere(query(), NOW, ["FOOD", "KIDS"] as Category[]);
    expect(where).toMatchObject({ category: { in: ["FOOD", "KIDS"] } });
  });

  it("prefers an explicit category over the saved selection", () => {
    const where = publicWhere(query({ category: "MUSIC" }), NOW, ["FOOD"] as Category[]);
    expect(where.category).toBe("MUSIC");
  });

  it("matches the city case-insensitively", () => {
    expect(publicWhere(query({ city: "Bengaluru" }), NOW)).toMatchObject({
      city: { equals: "Bengaluru", mode: "insensitive" },
    });
  });

  it("searches title, description and city together", () => {
    const where = publicWhere(query({ search: "jazz" }), NOW);
    expect(Array.isArray(where.OR)).toBe(true);
    expect(where.OR).toHaveLength(3);
  });

  it("combines filters with AND semantics rather than overwriting", () => {
    const where = publicWhere(query({ category: "MUSIC", city: "Bengaluru", search: "jazz" }), NOW);
    expect(where).toMatchObject({
      isActive: true,
      startsAt: { gt: NOW },
      category: "MUSIC",
      city: { equals: "Bengaluru", mode: "insensitive" },
    });
    expect(where.OR).toHaveLength(3);
  });

  it("omits category when neither an explicit nor a saved selection exists", () => {
    expect(publicWhere(query(), NOW)).not.toHaveProperty("category");
  });
});

describe("eventDto", () => {
  it("serialises dates as ISO strings", () => {
    const dto = eventDto(sample);
    expect(dto.startsAt).toBe("2026-11-01T13:00:00.000Z");
    expect(dto.createdAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("returns the exact decimal price as a fixed string", () => {
    expect(eventDto(sample).price).toBe("850.00");
  });

  it("defaults hasReminder to false and reflects an explicit value", () => {
    expect(eventDto(sample).hasReminder).toBe(false);
    expect(eventDto(sample, true).hasReminder).toBe(true);
  });

  it("exposes exactly the documented response fields and nothing more", () => {
    expect(Object.keys(eventDto(sample)).sort()).toEqual([
      "category", "city", "createdAt", "description", "hasReminder",
      "id", "imageUrl", "isActive", "price", "startsAt", "title", "updatedAt",
    ]);
  });

  it("never serialises the password hash or user credentials", () => {
    const dto = eventDto(sample) as Record<string, unknown>;
    expect(dto).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(dto)).not.toMatch(/password|secret|token/i);
  });

  it("preserves a null imageUrl rather than dropping the key", () => {
    expect(eventDto({ ...sample, imageUrl: null } as unknown as Event)).toHaveProperty("imageUrl", null);
  });
});