import { run } from "@jxa/run";
import { runAppleScript } from "run-applescript";
import { TEST_DATA } from "../fixtures/test-data.js";

export interface TestDataManager {
  setupTestData: () => Promise<void>;
  cleanupTestData: () => Promise<void>;
}

export function createTestDataManager(): TestDataManager {
  return {
    async setupTestData() {
      console.log("Setting up test contacts...");
      await setupTestContact();
      
      console.log("Setting up test notes folder...");
      await setupTestNotesFolder();
      
      console.log("Setting up test reminders list...");
      await setupTestRemindersList();
      
      console.log("Setting up test calendar...");
      await setupTestCalendar();
    },

    async cleanupTestData() {
      console.log("Cleaning up test notes...");
      await cleanupTestNotes();
      
      console.log("Cleaning up test reminders...");
      await cleanupTestReminders();
      
      console.log("Cleaning up test calendar events...");
      await cleanupTestCalendarEvents();
      
      // Note: We don't clean up contacts as they might be useful to keep
      console.log("Leaving test contact for manual cleanup if needed");
    }
  };
}

// Setup functions
async function setupTestContact(): Promise<void> {
  try {
    const script = `
tell application "Contacts"
    -- Check if test contact already exists
    set existingContacts to (every person whose name is "${TEST_DATA.CONTACT.name}")
    
    if (count of existingContacts) is 0 then
        -- Create new contact
        set newPerson to make new person with properties {first name:"Test Contact", last name:"Claude"}
        make new phone at end of phones of newPerson with properties {label:"iPhone", value:"${TEST_DATA.PHONE_NUMBER}"}
        save
        return "Created test contact"
    else
        return "Test contact already exists"
    end if
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not set up test contact:", error);
  }
}

async function setupTestNotesFolder(): Promise<void> {
  try {
    const script = `
tell application "Notes"
    set existingFolders to (every folder whose name is "${TEST_DATA.NOTES.folderName}")
    
    if (count of existingFolders) is 0 then
        make new folder with properties {name:"${TEST_DATA.NOTES.folderName}"}
        return "Created test notes folder"
    else
        return "Test notes folder already exists"
    end if
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not set up test notes folder:", error);
  }
}

async function setupTestRemindersList(): Promise<void> {
  try {
    const script = `
tell application "Reminders"
    set existingLists to (every list whose name is "${TEST_DATA.REMINDERS.listName}")
    
    if (count of existingLists) is 0 then
        make new list with properties {name:"${TEST_DATA.REMINDERS.listName}"}
        return "Created test reminders list"
    else
        return "Test reminders list already exists"
    end if
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not set up test reminders list:", error);
  }
}

async function setupTestCalendar(): Promise<void> {
  try {
    const script = `
tell application "Calendar"
    set existingCalendars to (every calendar whose name is "${TEST_DATA.CALENDAR.calendarName}")
    
    if (count of existingCalendars) is 0 then
        make new calendar with properties {name:"${TEST_DATA.CALENDAR.calendarName}"}
        return "Created test calendar"
    else
        return "Test calendar already exists"
    end if
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not set up test calendar:", error);
  }
}

// Cleanup functions
async function cleanupTestNotes(): Promise<void> {
  try {
    const script = `
tell application "Notes"
    set testFolders to (every folder whose name is "${TEST_DATA.NOTES.folderName}")
    
    repeat with testFolder in testFolders
        try
            -- Delete all notes in the folder first
            set folderNotes to notes of testFolder
            repeat with noteItem in folderNotes
                delete noteItem
            end repeat
            
            -- Then delete the folder
            delete testFolder
        on error
            -- Folder deletion might fail, just clear notes
            try
                set folderNotes to notes of testFolder
                repeat with noteItem in folderNotes
                    delete noteItem
                end repeat
            end try
        end try
    end repeat
    
    return "Test notes cleaned up"
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not clean up test notes:", error);
  }
}

async function cleanupTestReminders(): Promise<void> {
  try {
    const script = `
tell application "Reminders"
    set testLists to (every list whose name is "${TEST_DATA.REMINDERS.listName}")
    
    repeat with testList in testLists
        delete testList
    end repeat
    
    return "Test reminders cleaned up"
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not clean up test reminders:", error);
  }
}

async function cleanupTestCalendarEvents(): Promise<void> {
  try {
    const script = `
tell application "Calendar"
    set testCalendars to (every calendar whose name is "${TEST_DATA.CALENDAR.calendarName}")
    
    repeat with testCalendar in testCalendars
        try
            delete testCalendar
        on error
            -- Calendar deletion might fail due to system restrictions
            -- Just clear events instead
            delete (every event of testCalendar)
        end try
    end repeat
    
    return "Test calendar cleaned up"
end tell`;
    
    await runAppleScript(script);
  } catch (error) {
    console.warn("Could not clean up test calendar:", error);
  }
}

// Test assertion helpers
export function assertNotEmpty<T>(value: T[], message: string): void {
  if (!value || value.length === 0) {
    throw new Error(message);
  }
}

export function assertContains(haystack: string, needle: string, message: string): void {
  if (!haystack.toLowerCase().includes(needle.toLowerCase())) {
    throw new Error(`${message}. Expected "${haystack}" to contain "${needle}"`);
  }
}

export function assertValidPhoneNumber(phoneNumber: string | null): void {
  if (!phoneNumber) {
    throw new Error("Expected valid phone number, got null or undefined");
  }
  const normalized = phoneNumber.replace(/[^0-9+]/g, '');
  if (!normalized.includes('4803764369')) {
    throw new Error(`Expected phone number to contain test number, got: ${phoneNumber}`);
  }
}

export function assertValidDate(dateString: string | null): void {
  if (!dateString) {
    throw new Error("Expected valid date string, got null");
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
}

// Utility to wait for async operations
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}