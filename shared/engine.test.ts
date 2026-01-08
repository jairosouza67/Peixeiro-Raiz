import { describe, it, expect } from "vitest";
import { calculateSimulation, ENGINE_VERSION } from "./engine";

describe("calculateSimulation", () => {
  describe("Happy path scenarios", () => {
    it("should calculate for small fish (10g, 1000 qty, 26°C, 12 weeks)", () => {
      const result = calculateSimulation({
        initialWeight: 10,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 12,
        phase: "Autodetect",
      });

      // Assertions based on known behavior
      expect(result).toBeDefined();
      expect(result.feedType).toBe("Ração 40% 1,7 a 2 mm"); // From growth table
      expect(result.dailyFeedings).toBe(6); // From growth table
      expect(result.biomass).toBeGreaterThan(0);
      expect(result.dailyFeed).toBeGreaterThan(0);
      expect(result.feedPerFeeding).toBeGreaterThan(0);
      expect(Number.isInteger(result.feedPerFeeding)).toBe(true); // Should be rounded
      expect(result.dailyCost).toBeGreaterThan(0);
      expect(result.fcr).toBeGreaterThan(0);
      expect(result.projections).toHaveLength(12);
    });

    it("should calculate for medium fish (100g, 500 qty, 28°C, 8 weeks)", () => {
      const result = calculateSimulation({
        initialWeight: 100,
        quantity: 500,
        temperature: 28,
        feedPrice: 4.0,
        weeks: 8,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.feedType).toBe("Ração 35% 4 a 6 mm");
      expect(result.dailyFeedings).toBe(3);
      expect(result.projections).toHaveLength(8);
    });

    it("should calculate for large fish (500g, 200 qty, 24°C, 4 weeks)", () => {
      const result = calculateSimulation({
        initialWeight: 500,
        quantity: 200,
        temperature: 24,
        feedPrice: 5.0,
        weeks: 4,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.feedType).toBe("Ração 32% Crescimento 6 a 8 mm");
      expect(result.dailyFeedings).toBe(3);
      expect(result.projections).toHaveLength(4);
    });
  });

  describe("Temperature correction", () => {
    it("should apply temp correction factor for cold water (21°C)", () => {
      const coldResult = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 21,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      const normalResult = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      // Cold water should result in less weight gain
      expect(coldResult.projections[0].averageWeight).toBeLessThan(
        normalResult.projections[0].averageWeight
      );
    });

    it("should apply temp correction factor for hot water (32°C)", () => {
      const hotResult = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 32,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      const normalResult = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      // Hot water should also result in less weight gain
      expect(hotResult.projections[0].averageWeight).toBeLessThan(
        normalResult.projections[0].averageWeight
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle minimum weight (0.5g)", () => {
      const result = calculateSimulation({
        initialWeight: 0.5,
        quantity: 10000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.feedType).toBe("Ração 45% 1 mm");
      expect(result.dailyFeedings).toBe(6);
    });

    it("should handle very large fish (1000g)", () => {
      const result = calculateSimulation({
        initialWeight: 1000,
        quantity: 100,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.feedType).toBe("Ração Terminação 32% 6 a 8 mm");
      expect(result.dailyFeedings).toBe(3);
    });

    it("should handle single fish", () => {
      const result = calculateSimulation({
        initialWeight: 100,
        quantity: 1,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.biomass).toBeGreaterThan(0);
      expect(result.feedPerFeeding).toBeGreaterThan(0);
    });

    it("should handle single week simulation", () => {
      const result = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.projections).toHaveLength(1);
      expect(result.projections[0].week).toBe(1);
    });

    it("should handle maximum weeks (52)", () => {
      const result = calculateSimulation({
        initialWeight: 10,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 52,
        phase: "Autodetect",
      });

      expect(result).toBeDefined();
      expect(result.projections).toHaveLength(52);
      expect(result.projections[51].week).toBe(52);
    });
  });

  describe("Data integrity", () => {
    it("should return integer feedPerFeeding (grams)", () => {
      const result = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 1,
        phase: "Autodetect",
      });

      expect(Number.isInteger(result.feedPerFeeding)).toBe(true);
    });

    it("should have increasing accumulated consumption over weeks", () => {
      const result = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 5,
        phase: "Autodetect",
      });

      for (let i = 1; i < result.projections.length; i++) {
        expect(result.projections[i].accumulatedConsumption).toBeGreaterThan(
          result.projections[i - 1].accumulatedConsumption
        );
      }
    });

    it("should have increasing biomass over weeks (normal temp)", () => {
      const result = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 5,
        phase: "Autodetect",
      });

      for (let i = 1; i < result.projections.length; i++) {
        expect(result.projections[i].biomass).toBeGreaterThanOrEqual(
          result.projections[i - 1].biomass
        );
      }
    });

    it("should calculate FCR > 0 when there is weight gain", () => {
      const result = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 4.5,
        weeks: 10,
        phase: "Autodetect",
      });

      expect(result.fcr).toBeGreaterThan(0);
      expect(result.fcr).toBeLessThan(10); // Reasonable FCR range for tilapia
    });

    it("should calculate cost proportional to feed consumption and price", () => {
      const lowPrice = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 3.0,
        weeks: 1,
        phase: "Autodetect",
      });

      const highPrice = calculateSimulation({
        initialWeight: 50,
        quantity: 1000,
        temperature: 26,
        feedPrice: 6.0,
        weeks: 1,
        phase: "Autodetect",
      });

      // High price should result in exactly 2x the cost (same consumption)
      expect(highPrice.dailyCost).toBeCloseTo(lowPrice.dailyCost * 2, 2);
    });
  });

  describe("Engine version", () => {
    it("should export ENGINE_VERSION constant", () => {
      expect(ENGINE_VERSION).toBeDefined();
      expect(typeof ENGINE_VERSION).toBe("string");
      expect(ENGINE_VERSION).toBe("1.0.0");
    });
  });
});
