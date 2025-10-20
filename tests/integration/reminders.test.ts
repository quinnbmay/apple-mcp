import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, assertValidDate, sleep } from "../helpers/test-utils.js";
import remindersModule from "../../utils/reminders.js";

describe("Reminders Integration Tests", () => {
  describe("getAllLists", () => {
    it("should retrieve all reminder lists", async () => {
      const lists = await remindersModule.getAllLists();
      
      expect(Array.isArray(lists)).toBe(true);
      console.log(`Found ${lists.length} reminder lists`);
      
      if (lists.length > 0) {
        for (const list of lists) {
          expect(typeof list.name).toBe("string");
          expect(typeof list.id).toBe("string");
          expect(list.name.length).toBeGreaterThan(0);
          expect(list.id.length).toBeGreaterThan(0);
          
          console.log(`  - "${list.name}" (ID: ${list.id})`);
        }
        
        // Check if our test list exists
        const testList = lists.find(list => list.name === TEST_DATA.REMINDERS.listName);
        if (testList) {
          console.log(`✅ Found test list: "${testList.name}"`);
        }
      } else {
        console.log("ℹ️ No reminder lists found");
      }
    }, 15000);
  });

  describe("getAllReminders", () => {
    it("should retrieve all reminders", async () => {
      const reminders = await remindersModule.getAllReminders();
      
      expect(Array.isArray(reminders)).toBe(true);
      console.log(`Found ${reminders.length} total reminders`);
      
      if (reminders.length > 0) {
        for (const reminder of reminders.slice(0, 10)) { // Show first 10
          expect(typeof reminder.name).toBe("string");
          expect(reminder.name.length).toBeGreaterThan(0);
          
          console.log(`  - "${reminder.name}"`);
          if (reminder.completed !== undefined) {
            console.log(`    Status: ${reminder.completed ? 'Completed' : 'Not completed'}`);
          }
          if (reminder.dueDate) {
            console.log(`    Due: ${new Date(reminder.dueDate).toLocaleDateString()}`);
          }
        }
        
        if (reminders.length > 10) {
          console.log(`  ... and ${reminders.length - 10} more`);
        }
      }
    }, 15000);
  });

  describe("createReminder", () => {
    it("should create a reminder in test list", async () => {
      const testReminderName = `${TEST_DATA.REMINDERS.testReminder.name} ${Date.now()}`;
      
      const result = await remindersModule.createReminder(
        testReminderName,
        TEST_DATA.REMINDERS.listName,
        TEST_DATA.REMINDERS.testReminder.notes
      );
      
      expect(typeof result.name).toBe("string");
      expect(result.name).toBe(testReminderName);
      
      console.log(`✅ Created reminder: "${result.name}"`);
      
      if (result.id) {
        console.log(`  ID: ${result.id}`);
      }
      if (result.listName) {
        console.log(`  List: ${result.listName}`);
      }
    }, 10000);

    it("should create a reminder with due date", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow
      
      const reminderName = `Due Date Test Reminder ${Date.now()}`;
      
      const result = await remindersModule.createReminder(
        reminderName,
        TEST_DATA.REMINDERS.listName,
        "This reminder has a due date",
        tomorrow.toISOString()
      );
      
      expect(result.name).toBe(reminderName);
      console.log(`✅ Created reminder with due date: "${result.name}"`);
      console.log(`  Due: ${tomorrow.toLocaleString()}`);
    }, 10000);

    it("should create a reminder in default list when list not specified", async () => {
      const reminderName = `Default List Test ${Date.now()}`;
      
      const result = await remindersModule.createReminder(
        reminderName,
        undefined, // No list specified
        "This reminder should go to the default list"
      );
      
      expect(result.name).toBe(reminderName);
      console.log(`✅ Created reminder in default list: "${result.name}"`);
    }, 10000);
  });

  describe("searchReminders", () => {
    it("should find reminders by search text", async () => {
      // First create a searchable reminder
      const searchableReminderName = `Searchable Reminder ${Date.now()}`;
      await remindersModule.createReminder(
        searchableReminderName,
        TEST_DATA.REMINDERS.listName,
        "This reminder contains SEARCHABLE keyword for testing"
      );
      
      await sleep(2000); // Wait for reminder to be indexed
      
      // Now search for it
      const searchResults = await remindersModule.searchReminders("Searchable");
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      if (searchResults.length > 0) {
        console.log(`✅ Found ${searchResults.length} reminders matching "Searchable"`);
        
        const matchingReminder = searchResults.find(reminder => 
          reminder.name.includes("Searchable")
        );
        
        if (matchingReminder) {
          console.log(`  - "${matchingReminder.name}"`);
        }
      } else {
        console.log("ℹ️ No reminders found for 'Searchable' - may need time for indexing");
      }
    }, 20000);

    it("should search by keyword in notes", async () => {
      const searchResults = await remindersModule.searchReminders("SEARCHABLE");
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      if (searchResults.length > 0) {
        console.log(`✅ Found ${searchResults.length} reminders with "SEARCHABLE" keyword`);
        
        for (const reminder of searchResults.slice(0, 3)) {
          console.log(`  - "${reminder.name}"`);
        }
      }
    }, 15000);

    it("should handle search with no results", async () => {
      const searchResults = await remindersModule.searchReminders("VeryUniqueSearchTerm12345");
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
      
      console.log("✅ Handled search with no results correctly");
    }, 10000);
  });

  describe("openReminder", () => {
    it("should open a reminder by search", async () => {
      // First create a reminder to open
      const reminderToOpen = `Open Test Reminder ${Date.now()}`;
      await remindersModule.createReminder(
        reminderToOpen,
        TEST_DATA.REMINDERS.listName,
        "This reminder will be opened for testing"
      );
      
      await sleep(2000); // Wait for reminder to be created
      
      const result = await remindersModule.openReminder("Open Test");
      
      if (result.success) {
        expect(result.reminder).toBeTruthy();
        expect(typeof result.reminder?.name).toBe("string");
        
        console.log(`✅ Successfully opened reminder: "${result.reminder?.name}"`);
      } else {
        console.log(`ℹ️ Could not open reminder: ${result.message}`);
      }
    }, 20000);

    it("should handle opening non-existent reminder", async () => {
      const result = await remindersModule.openReminder("NonExistentReminder12345");
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Handled non-existent reminder correctly");
    }, 10000);
  });

  describe("getRemindersFromListById", () => {
    it("should get reminders from test list by ID", async () => {
      // First get all lists to find our test list ID
      const allLists = await remindersModule.getAllLists();
      const testList = allLists.find(list => list.name === TEST_DATA.REMINDERS.listName);
      
      if (testList) {
        const reminders = await remindersModule.getRemindersFromListById(testList.id);
        
        expect(Array.isArray(reminders)).toBe(true);
        console.log(`✅ Found ${reminders.length} reminders in test list "${testList.name}"`);
        
        if (reminders.length > 0) {
          for (const reminder of reminders) {
            expect(typeof reminder.name).toBe("string");
            console.log(`  - "${reminder.name}"`);
          }
        }
      } else {
        console.log("ℹ️ Test list not found - skipping list-specific reminder retrieval");
      }
    }, 15000);

    it("should get reminders with specific properties", async () => {
      const allLists = await remindersModule.getAllLists();
      
      if (allLists.length > 0) {
        const testList = allLists[0]; // Use first available list
        const properties = ["name", "completed", "dueDate", "notes"];
        
        const reminders = await remindersModule.getRemindersFromListById(
          testList.id,
          properties
        );
        
        expect(Array.isArray(reminders)).toBe(true);
        console.log(`✅ Retrieved reminders with specific properties from "${testList.name}"`);
        
        if (reminders.length > 0) {
          const firstReminder = reminders[0];
          
          // Check that requested properties are present
          for (const prop of properties) {
            if (firstReminder[prop] !== undefined) {
              console.log(`  Property "${prop}": present`);
            }
          }
        }
      }
    }, 15000);

    it("should handle invalid list ID gracefully", async () => {
      const reminders = await remindersModule.getRemindersFromListById("invalid-list-id");
      
      expect(Array.isArray(reminders)).toBe(true);
      expect(reminders.length).toBe(0);
      
      console.log("✅ Handled invalid list ID correctly");
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle empty reminder name gracefully", async () => {
      try {
        await remindersModule.createReminder("", TEST_DATA.REMINDERS.listName);
        console.log("⚠️ Empty reminder name was accepted (unexpected)");
      } catch (error) {
        console.log("✅ Empty reminder name was correctly rejected");
        expect(error instanceof Error).toBe(true);
      }
    }, 5000);

    it("should handle empty search text gracefully", async () => {
      const searchResults = await remindersModule.searchReminders("");
      
      expect(Array.isArray(searchResults)).toBe(true);
      console.log("✅ Handled empty search text correctly");
    }, 5000);

    it("should handle invalid due date gracefully", async () => {
      try {
        const result = await remindersModule.createReminder(
          `Invalid Due Date Test ${Date.now()}`,
          TEST_DATA.REMINDERS.listName,
          "Test reminder",
          "invalid-date-format"
        );
        
        // If it succeeds, the invalid date was ignored
        console.log("✅ Invalid due date was handled gracefully");
        expect(result.name).toBeTruthy();
      } catch (error) {
        console.log("✅ Invalid due date was correctly rejected");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle non-existent list gracefully", async () => {
      try {
        const result = await remindersModule.createReminder(
          `Non-existent List Test ${Date.now()}`,
          "NonExistentList12345",
          "Test reminder for non-existent list"
        );
        
        // Should either succeed (create in default) or fail gracefully
        if (result.name) {
          console.log("✅ Non-existent list handled by using default list");
        }
      } catch (error) {
        console.log("✅ Non-existent list was correctly rejected");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);
  });
});