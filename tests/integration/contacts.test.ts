import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, assertValidPhoneNumber } from "../helpers/test-utils.js";
import contactsModule from "../../utils/contacts.js";

describe("Contacts Integration Tests", () => {
  describe("getAllNumbers", () => {
    it("should retrieve all contacts with phone numbers", async () => {
      const allNumbers = await contactsModule.getAllNumbers();
      
      expect(typeof allNumbers).toBe("object");
      expect(allNumbers).not.toBeNull();
      
      // Should contain our test contact if it exists
      const contactNames = Object.keys(allNumbers);
      console.log(`Found ${contactNames.length} contacts with phone numbers`);
      
      // Verify structure - each contact should have an array of phone numbers
      for (const [name, phoneNumbers] of Object.entries(allNumbers)) {
        expect(typeof name).toBe("string");
        expect(Array.isArray(phoneNumbers)).toBe(true);
        // Some contacts might have empty phone number arrays, so just check structure
        if (phoneNumbers.length > 0) {
          // Verify each phone number is a string
          for (const phoneNumber of phoneNumbers) {
            expect(typeof phoneNumber).toBe("string");
            expect(phoneNumber.length).toBeGreaterThan(0);
          }
        }
      }
    }, 15000); // 15 second timeout for contacts access
  });

  describe("findNumber", () => {
    it("should find phone number for existing contact", async () => {
      const phoneNumbers = await contactsModule.findNumber("Test Contact");
      
      // If our test contact exists, it should return phone numbers
      if (phoneNumbers.length > 0) {
        assertNotEmpty(phoneNumbers, "Expected to find phone numbers for test contact");
        // Only validate if we actually have a phone number
        if (phoneNumbers[0]) {
          assertValidPhoneNumber(phoneNumbers[0]);
        }
        console.log(`Found phone numbers for test contact: ${phoneNumbers.join(", ")}`);
      } else {
        console.log("Test contact not found - this is expected if test contact hasn't been created yet");
      }
    }, 10000);

    it("should return empty array for non-existent contact", async () => {
      const phoneNumbers = await contactsModule.findNumber("NonExistentContactName123456");
      
      expect(Array.isArray(phoneNumbers)).toBe(true);
      expect(phoneNumbers.length).toBe(0);
    }, 10000);

    it("should handle partial name matches", async () => {
      // Try to find contacts with partial name
      const phoneNumbers = await contactsModule.findNumber("Test");
      
      // This might return results if there are contacts with "Test" in their name
      expect(Array.isArray(phoneNumbers)).toBe(true);
      
      if (phoneNumbers.length > 0) {
        console.log(`Found ${phoneNumbers.length} phone numbers for partial match 'Test'`);
        for (const phoneNumber of phoneNumbers) {
          expect(typeof phoneNumber).toBe("string");
        }
      }
    }, 10000);
  });

  describe("findContactByPhone", () => {
    it("should find contact by phone number", async () => {
      const contactName = await contactsModule.findContactByPhone(TEST_DATA.PHONE_NUMBER);
      
      if (contactName) {
        expect(typeof contactName).toBe("string");
        expect(contactName.length).toBeGreaterThan(0);
        console.log(`Found contact name for ${TEST_DATA.PHONE_NUMBER}: ${contactName}`);
      } else {
        console.log(`No contact found for ${TEST_DATA.PHONE_NUMBER} - this is expected if test contact doesn't exist`);
      }
    }, 10000);

    it("should return null for non-existent phone number", async () => {
      const contactName = await contactsModule.findContactByPhone("+1 9999999999");
      
      expect(contactName).toBeNull();
    }, 10000);

    it("should handle different phone number formats", async () => {
      const testNumbers = [
        TEST_DATA.PHONE_NUMBER,
        TEST_DATA.PHONE_NUMBER.replace(/[^0-9]/g, ""), // Remove formatting
        TEST_DATA.PHONE_NUMBER.replace("+1 ", ""), // Remove country code prefix
        TEST_DATA.PHONE_NUMBER.replace(/\s/g, "") // Remove spaces
      ];

      for (const phoneNumber of testNumbers) {
        const contactName = await contactsModule.findContactByPhone(phoneNumber);
        
        if (contactName) {
          console.log(`Format ${phoneNumber} found contact: ${contactName}`);
        } else {
          console.log(`Format ${phoneNumber} did not find contact`);
        }
        
        // Should return null or string, never undefined
        expect(contactName === null || typeof contactName === "string").toBe(true);
      }
    }, 15000);
  });

  describe("Error Handling", () => {
    it("should handle empty string input gracefully", async () => {
      const phoneNumbers = await contactsModule.findNumber("");
      expect(Array.isArray(phoneNumbers)).toBe(true);
    }, 5000);

    it("should handle null/undefined phone number search gracefully", async () => {
      const contactName1 = await contactsModule.findContactByPhone("");
      const contactName2 = await contactsModule.findContactByPhone("invalid");
      
      expect(contactName1).toBeNull();
      expect(contactName2).toBeNull();
    }, 5000);
  });
});