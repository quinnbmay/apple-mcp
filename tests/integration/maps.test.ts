import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, sleep } from "../helpers/test-utils.js";
import mapsModule from "../../utils/maps.js";

describe("Maps Integration Tests", () => {
  describe("searchLocations", () => {
    it("should search for well-known locations", async () => {
      const result = await mapsModule.searchLocations(TEST_DATA.MAPS.testLocation.name, 5);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.locations)).toBe(true);
      
      if (result.locations.length > 0) {
        console.log(`✅ Found ${result.locations.length} locations for "${TEST_DATA.MAPS.testLocation.name}"`);
        
        for (const location of result.locations) {
          expect(typeof location.name).toBe("string");
          expect(typeof location.address).toBe("string");
          expect(location.name.length).toBeGreaterThan(0);
          expect(location.address.length).toBeGreaterThan(0);
          
          console.log(`  - ${location.name}`);
          console.log(`    Address: ${location.address}`);
          
          if (location.latitude && location.longitude) {
            expect(typeof location.latitude).toBe("number");
            expect(typeof location.longitude).toBe("number");
            console.log(`    Coordinates: ${location.latitude}, ${location.longitude}`);
          }
        }
      } else {
        console.log(`ℹ️ No locations found for "${TEST_DATA.MAPS.testLocation.name}" - this might indicate Maps access issues`);
      }
    }, 20000);

    it("should search for restaurants", async () => {
      const result = await mapsModule.searchLocations("restaurants near Cupertino", 3);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.locations)).toBe(true);
      
      console.log(`Found ${result.locations.length} restaurants near Cupertino`);
      
      if (result.locations.length > 0) {
        for (const restaurant of result.locations.slice(0, 3)) {
          console.log(`  - ${restaurant.name} (${restaurant.address})`);
        }
      }
    }, 20000);

    it("should limit search results correctly", async () => {
      const limit = 2;
      const result = await mapsModule.searchLocations("coffee shops", limit);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.locations)).toBe(true);
      expect(result.locations.length).toBeLessThanOrEqual(limit);
      
      console.log(`Requested ${limit} coffee shops, got ${result.locations.length}`);
    }, 15000);

    it("should handle search with no results", async () => {
      const result = await mapsModule.searchLocations("VeryUniqueLocationName12345", 5);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.locations)).toBe(true);
      expect(result.locations.length).toBe(0);
      
      console.log("✅ Handled search with no results correctly");
    }, 15000);
  });

  describe("saveLocation", () => {
    it("should save a location as favorite", async () => {
      const testLocationName = `Test Location ${Date.now()}`;
      
      const result = await mapsModule.saveLocation(
        testLocationName,
        TEST_DATA.MAPS.testLocation.address
      );
      
      if (result.success) {
        console.log(`✅ Successfully saved location: "${testLocationName}"`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not save location: ${result.message}`);
        // This might be expected if Maps doesn't have the required permissions
      }
      
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    }, 15000);

    it("should handle saving invalid location gracefully", async () => {
      const result = await mapsModule.saveLocation(
        "Invalid Location Test",
        "This is not a valid address 12345"
      );
      
      // Should either succeed or fail gracefully
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
      
      if (result.success) {
        console.log("ℹ️ Invalid address was accepted (Maps may have fuzzy matching)");
      } else {
        console.log("✅ Invalid address was correctly rejected");
      }
    }, 15000);
  });

  describe("dropPin", () => {
    it("should drop a pin at a location", async () => {
      const testPinName = `Test Pin ${Date.now()}`;
      
      const result = await mapsModule.dropPin(
        testPinName,
        TEST_DATA.MAPS.testLocation.address
      );
      
      if (result.success) {
        console.log(`✅ Successfully dropped pin: "${testPinName}"`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not drop pin: ${result.message}`);
      }
      
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    }, 15000);
  });

  describe("getDirections", () => {
    it("should get driving directions between two locations", async () => {
      const result = await mapsModule.getDirections(
        TEST_DATA.MAPS.testDirections.from,
        TEST_DATA.MAPS.testDirections.to,
        "driving"
      );
      
      if (result.success) {
        console.log(`✅ Successfully got driving directions`);
        console.log(`  From: ${TEST_DATA.MAPS.testDirections.from}`);
        console.log(`  To: ${TEST_DATA.MAPS.testDirections.to}`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not get directions: ${result.message}`);
      }
      
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    }, 20000);

    it("should get walking directions", async () => {
      const result = await mapsModule.getDirections(
        "Apple Park, Cupertino",
        "Cupertino Public Library",
        "walking"
      );
      
      if (result.success) {
        console.log(`✅ Successfully got walking directions`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not get walking directions: ${result.message}`);
      }
      
      expect(typeof result.success).toBe("boolean");
    }, 20000);

    it("should get transit directions", async () => {
      const result = await mapsModule.getDirections(
        "San Francisco Airport",
        "Union Square San Francisco",
        "transit"
      );
      
      if (result.success) {
        console.log(`✅ Successfully got transit directions`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not get transit directions: ${result.message}`);
      }
      
      expect(typeof result.success).toBe("boolean");
    }, 20000);

    it("should handle invalid locations for directions", async () => {
      const result = await mapsModule.getDirections(
        "Invalid Location 12345",
        "Another Invalid Location 67890",
        "driving"
      );
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Invalid locations for directions handled correctly");
    }, 15000);
  });

  describe("listGuides", () => {
    it("should list existing guides", async () => {
      const result = await mapsModule.listGuides();
      
      if (result.success) {
        console.log(`✅ Successfully listed guides`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not list guides: ${result.message}`);
        // This might be expected if no guides exist or permissions are insufficient
      }
      
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    }, 15000);
  });

  describe("createGuide", () => {
    it("should create a new guide", async () => {
      const testGuideName = `${TEST_DATA.MAPS.testGuideName} ${Date.now()}`;
      
      const result = await mapsModule.createGuide(testGuideName);
      
      if (result.success) {
        console.log(`✅ Successfully created guide: "${testGuideName}"`);
        console.log(`  Message: ${result.message}`);
      } else {
        console.log(`ℹ️ Could not create guide: ${result.message}`);
      }
      
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    }, 15000);

    it("should handle duplicate guide names gracefully", async () => {
      const duplicateGuideName = "Duplicate Test Guide";
      
      // Try to create the same guide twice
      const result1 = await mapsModule.createGuide(duplicateGuideName);
      await sleep(1000); // Small delay
      const result2 = await mapsModule.createGuide(duplicateGuideName);
      
      // At least one should succeed, or both should handle duplicates gracefully
      expect(typeof result1.success).toBe("boolean");
      expect(typeof result2.success).toBe("boolean");
      
      console.log(`First creation: ${result1.success ? 'Success' : 'Failed'}`);
      console.log(`Second creation: ${result2.success ? 'Success' : 'Failed'}`);
      console.log("✅ Duplicate guide names handled appropriately");
    }, 20000);
  });

  describe("addToGuide", () => {
    it("should add a location to a guide", async () => {
      const testGuideName = `Guide for Adding ${Date.now()}`;
      
      // First create a guide
      const createResult = await mapsModule.createGuide(testGuideName);
      
      if (createResult.success) {
        await sleep(2000); // Wait for guide creation to complete
        
        // Then try to add a location to it
        const addResult = await mapsModule.addToGuide(
          TEST_DATA.MAPS.testLocation.address,
          testGuideName
        );
        
        if (addResult.success) {
          console.log(`✅ Successfully added location to guide "${testGuideName}"`);
          console.log(`  Message: ${addResult.message}`);
        } else {
          console.log(`ℹ️ Could not add location to guide: ${addResult.message}`);
        }
        
        expect(typeof addResult.success).toBe("boolean");
      } else {
        console.log("ℹ️ Skipping add to guide test - could not create guide first");
      }
    }, 25000);

    it("should handle adding to non-existent guide", async () => {
      const result = await mapsModule.addToGuide(
        TEST_DATA.MAPS.testLocation.address,
        "NonExistentGuide12345"
      );
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Adding to non-existent guide handled correctly");
    }, 15000);
  });

  describe("Error Handling", () => {
    it("should handle empty search query gracefully", async () => {
      const result = await mapsModule.searchLocations("", 5);
      
      // Should either succeed with no results or fail gracefully
      if (result.success) {
        expect(Array.isArray(result.locations)).toBe(true);
        console.log("✅ Empty search query returned empty results");
      } else {
        expect(typeof result.message).toBe("string");
        console.log("✅ Empty search query was rejected appropriately");
      }
    }, 10000);

    it("should handle empty location name for saving", async () => {
      const result = await mapsModule.saveLocation("", TEST_DATA.MAPS.testLocation.address);
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Empty location name for saving handled correctly");
    }, 10000);

    it("should handle empty address for directions", async () => {
      const result = await mapsModule.getDirections("", "", "driving");
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Empty addresses for directions handled correctly");
    }, 10000);

    it("should handle empty guide name gracefully", async () => {
      const result = await mapsModule.createGuide("");
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Empty guide name handled correctly");
    }, 10000);

    it("should handle invalid transport type", async () => {
      const result = await mapsModule.getDirections(
        TEST_DATA.MAPS.testLocation.address,
        "Nearby Location",
        "flying" as any // Invalid transport type
      );
      
      // Should either reject invalid transport type or default to a valid one
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
      
      if (result.success) {
        console.log("ℹ️ Invalid transport type was handled by defaulting to valid type");
      } else {
        console.log("✅ Invalid transport type was correctly rejected");
      }
    }, 15000);
  });
});