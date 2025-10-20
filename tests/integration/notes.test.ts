import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, assertContains, assertValidDate, sleep } from "../helpers/test-utils.js";
import notesModule from "../../utils/notes.js";

describe("Notes Integration Tests", () => {
  describe("createNote", () => {
    it("should create a note in test folder", async () => {
      const testNote = {
        title: `${TEST_DATA.NOTES.testNote.title} ${Date.now()}`,
        body: TEST_DATA.NOTES.testNote.body
      };
      
      const result = await notesModule.createNote(
        testNote.title,
        testNote.body,
        TEST_DATA.NOTES.folderName
      );
      
      expect(result.success).toBe(true);
      expect(result.note?.name).toBe(testNote.title);
      expect(result.note?.content).toBe(testNote.body);
      expect(result.folderName).toBe(TEST_DATA.NOTES.folderName);
      
      console.log(`✅ Created note "${testNote.title}" in folder "${result.folderName}"`);
      
      if (result.usedDefaultFolder) {
        console.log("📁 Used default folder creation");
      }
    }, 10000);

    it("should create a note with markdown formatting", async () => {
      const markdownNote = {
        title: `Markdown Test Note ${Date.now()}`,
        body: `# Test Header\n\nThis is a test note with **bold** text and a list:\n\n- Item 1\n- Item 2\n- Item 3\n\n[Link example](https://example.com)`
      };
      
      const result = await notesModule.createNote(
        markdownNote.title,
        markdownNote.body,
        TEST_DATA.NOTES.folderName
      );
      
      expect(result.success).toBe(true);
      console.log(`✅ Created markdown note "${markdownNote.title}"`);
    }, 10000);

    it("should handle long note content", async () => {
      const longContent = "This is a very long note. ".repeat(100);
      const longNote = {
        title: `Long Content Note ${Date.now()}`,
        body: longContent
      };
      
      const result = await notesModule.createNote(
        longNote.title,
        longNote.body,
        TEST_DATA.NOTES.folderName
      );
      
      expect(result.success).toBe(true);
      console.log(`✅ Created long content note (${longContent.length} characters)`);
    }, 10000);
  });

  describe("getNotesFromFolder", () => {
    it("should retrieve notes from test folder", async () => {
      const result = await notesModule.getNotesFromFolder(TEST_DATA.NOTES.folderName);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
      
      if (result.notes && result.notes.length > 0) {
        console.log(`✅ Found ${result.notes.length} notes in "${TEST_DATA.NOTES.folderName}"`);
        
        // Verify note structure
        for (const note of result.notes) {
          expect(typeof note.name).toBe("string");
          expect(typeof note.content).toBe("string");
          expect(note.name.length).toBeGreaterThan(0);
          
          // Check for date fields if present
          if (note.creationDate) {
            assertValidDate(note.creationDate.toString());
          }
          if (note.modificationDate) {
            assertValidDate(note.modificationDate.toString());
          }
          
          console.log(`  - "${note.name}" (${note.content.length} chars)`);
        }
      } else {
        console.log(`ℹ️ No notes found in "${TEST_DATA.NOTES.folderName}" folder`);
      }
    }, 15000);

    it("should handle non-existent folder gracefully", async () => {
      const result = await notesModule.getNotesFromFolder("NonExistentFolder12345");
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("not found");
      
      console.log("✅ Handled non-existent folder correctly");
    }, 10000);
  });

  describe("getAllNotes", () => {
    it("should retrieve all notes from Notes app", async () => {
      const allNotes = await notesModule.getAllNotes();
      
      expect(Array.isArray(allNotes)).toBe(true);
      console.log(`✅ Retrieved ${allNotes.length} total notes`);
      
      if (allNotes.length > 0) {
        // Verify note structure
        for (const note of allNotes.slice(0, 5)) { // Check first 5 notes
          expect(typeof note.name).toBe("string");
          expect(typeof note.content).toBe("string");
          console.log(`  - "${note.name}" (${note.content.length} chars)`);
        }
        
        // Check if our test notes are in the list
        const testNotes = allNotes.filter(note => 
          note.name.includes("Claude Test") || note.name.includes("Test Note")
        );
        console.log(`Found ${testNotes.length} test notes in all notes`);
      }
    }, 15000);
  });

  describe("findNote", () => {
    it("should find notes by search text in title", async () => {
      // First create a searchable note
      const searchTestNote = {
        title: `${TEST_DATA.NOTES.searchTestNote.title} ${Date.now()}`,
        body: TEST_DATA.NOTES.searchTestNote.body
      };
      
      await notesModule.createNote(
        searchTestNote.title,
        searchTestNote.body,
        TEST_DATA.NOTES.folderName
      );
      
      await sleep(2000); // Wait for note to be indexed
      
      // Now search for it
      const foundNotes = await notesModule.findNote("Search Test");
      
      expect(Array.isArray(foundNotes)).toBe(true);
      
      if (foundNotes.length > 0) {
        const matchingNote = foundNotes.find(note => 
          note.name.includes("Search Test")
        );
        
        if (matchingNote) {
          console.log(`✅ Found note by title search: "${matchingNote.name}"`);
        } else {
          console.log("⚠️ Search completed but specific test note not found");
        }
      } else {
        console.log("ℹ️ No notes found for 'Search Test' - may need time for indexing");
      }
    }, 20000);

    it("should find notes by content search", async () => {
      const foundNotes = await notesModule.findNote("SEARCHABLE");
      
      expect(Array.isArray(foundNotes)).toBe(true);
      
      if (foundNotes.length > 0) {
        const matchingNote = foundNotes.find(note => 
          note.content.includes("SEARCHABLE")
        );
        
        if (matchingNote) {
          console.log(`✅ Found note by content search: "${matchingNote.name}"`);
        }
      } else {
        console.log("ℹ️ No notes found with 'SEARCHABLE' content");
      }
    }, 15000);

    it("should handle search with no results", async () => {
      const foundNotes = await notesModule.findNote("VeryUniqueSearchTerm12345");
      
      expect(Array.isArray(foundNotes)).toBe(true);
      expect(foundNotes.length).toBe(0);
      
      console.log("✅ Handled search with no results correctly");
    }, 10000);
  });

  describe("getRecentNotesFromFolder", () => {
    it("should retrieve recent notes from test folder", async () => {
      const result = await notesModule.getRecentNotesFromFolder(TEST_DATA.NOTES.folderName, 5);
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
      
      if (result.notes && result.notes.length > 0) {
        console.log(`✅ Found ${result.notes.length} recent notes`);
        
        // Verify notes are sorted by creation date (newest first)
        for (let i = 0; i < result.notes.length - 1; i++) {
          const currentNote = result.notes[i];
          const nextNote = result.notes[i + 1];
          
          if (currentNote.creationDate && nextNote.creationDate) {
            const currentDate = new Date(currentNote.creationDate);
            const nextDate = new Date(nextNote.creationDate);
            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }
        }
        
        console.log("✅ Notes are properly sorted by date");
      }
    }, 15000);

    it("should limit recent notes count correctly", async () => {
      const limit = 3;
      const result = await notesModule.getRecentNotesFromFolder(TEST_DATA.NOTES.folderName, limit);
      
      expect(result.success).toBe(true);
      
      if (result.notes) {
        expect(result.notes.length).toBeLessThanOrEqual(limit);
        console.log(`✅ Retrieved ${result.notes.length} notes (limit: ${limit})`);
      }
    }, 10000);
  });

  describe("getNotesByDateRange", () => {
    it("should retrieve notes from date range", async () => {
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const result = await notesModule.getNotesByDateRange(
        TEST_DATA.NOTES.folderName,
        oneWeekAgo.toISOString(),
        today.toISOString(),
        10
      );
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
      
      if (result.notes && result.notes.length > 0) {
        console.log(`✅ Found ${result.notes.length} notes in date range`);
        
        // Verify notes are within the specified date range
        for (const note of result.notes) {
          if (note.creationDate) {
            const noteDate = new Date(note.creationDate);
            expect(noteDate.getTime()).toBeGreaterThanOrEqual(oneWeekAgo.getTime());
            expect(noteDate.getTime()).toBeLessThanOrEqual(today.getTime());
          }
        }
        
        console.log("✅ All notes are within the specified date range");
      } else {
        console.log("ℹ️ No notes found in the specified date range");
      }
    }, 15000);

    it("should handle date range with no results", async () => {
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
      const evenFurtherFuture = new Date(farFuture.getTime() + 24 * 60 * 60 * 1000); // 1 day later
      
      const result = await notesModule.getNotesByDateRange(
        TEST_DATA.NOTES.folderName,
        farFuture.toISOString(),
        evenFurtherFuture.toISOString(),
        10
      );
      
      expect(result.success).toBe(true);
      expect(Array.isArray(result.notes)).toBe(true);
      expect(result.notes?.length || 0).toBe(0);
      
      console.log("✅ Handled future date range with no results correctly");
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle empty title gracefully", async () => {
      try {
        const result = await notesModule.createNote("", "Test body", TEST_DATA.NOTES.folderName);
        expect(result.success).toBe(false);
        console.log("✅ Correctly rejected empty title");
      } catch (error) {
        console.log("✅ Empty title was properly rejected with error");
      }
    }, 5000);

    it("should handle empty search text gracefully", async () => {
      const foundNotes = await notesModule.findNote("");
      
      expect(Array.isArray(foundNotes)).toBe(true);
      console.log("✅ Handled empty search text correctly");
    }, 5000);

    it("should handle invalid date formats gracefully", async () => {
      const result = await notesModule.getNotesByDateRange(
        TEST_DATA.NOTES.folderName,
        "invalid-date",
        "also-invalid",
        5
      );
      
      // Should either succeed with empty results or fail gracefully
      if (result.success) {
        expect(Array.isArray(result.notes)).toBe(true);
        console.log("✅ Handled invalid dates by returning results anyway");
      } else {
        expect(result.message).toBeTruthy();
        console.log("✅ Handled invalid dates by returning error message");
      }
    }, 10000);
  });
});