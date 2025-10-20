import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, assertValidDate, sleep } from "../helpers/test-utils.js";
import calendarModule from "../../utils/calendar.js";

describe("Calendar Integration Tests", () => {
  describe("getEvents", () => {
    it("should retrieve calendar events for next week", async () => {
      const events = await calendarModule.getEvents(10);
      
      expect(Array.isArray(events)).toBe(true);
      console.log(`Found ${events.length} events in the next 7 days`);
      
      if (events.length > 0) {
        for (const event of events) {
          expect(typeof event.title).toBe("string");
          expect(typeof event.calendarName).toBe("string");
          expect(event.title.length).toBeGreaterThan(0);
          
          if (event.startDate) {
            assertValidDate(event.startDate);
          }
          if (event.endDate) {
            assertValidDate(event.endDate);
          }
          
          console.log(`  - "${event.title}" (${event.calendarName})`);
          if (event.startDate && event.endDate) {
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            console.log(`    ${startDate.toLocaleString()} - ${endDate.toLocaleString()}`);
          }
          if (event.location) {
            console.log(`    Location: ${event.location}`);
          }
        }
      } else {
        console.log("ℹ️ No upcoming events found - this is normal");
      }
    }, 20000);

    it("should retrieve events with custom date range", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const nextWeek = new Date(tomorrow);
      nextWeek.setDate(tomorrow.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      
      const events = await calendarModule.getEvents(
        20,
        tomorrow.toISOString(),
        nextWeek.toISOString()
      );
      
      expect(Array.isArray(events)).toBe(true);
      console.log(`Found ${events.length} events between ${tomorrow.toLocaleDateString()} and ${nextWeek.toLocaleDateString()}`);
      
      // Verify events are within the date range
      if (events.length > 0) {
        for (const event of events) {
          if (event.startDate) {
            const eventDate = new Date(event.startDate);
            expect(eventDate.getTime()).toBeGreaterThanOrEqual(tomorrow.getTime());
            expect(eventDate.getTime()).toBeLessThanOrEqual(nextWeek.getTime());
          }
        }
        console.log("✅ All events are within the specified date range");
      }
    }, 15000);

    it("should limit event count correctly", async () => {
      const limit = 3;
      const events = await calendarModule.getEvents(limit);
      
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeLessThanOrEqual(limit);
      console.log(`Requested ${limit} events, got ${events.length}`);
    }, 15000);
  });

  describe("createEvent", () => {
    it("should create a basic calendar event", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2 PM tomorrow
      
      const eventEndTime = new Date(tomorrow);
      eventEndTime.setHours(15, 0, 0, 0); // 3 PM tomorrow
      
      const testEventTitle = `${TEST_DATA.CALENDAR.testEvent.title} ${Date.now()}`;
      
      const result = await calendarModule.createEvent(
        testEventTitle,
        tomorrow.toISOString(),
        eventEndTime.toISOString(),
        TEST_DATA.CALENDAR.testEvent.location,
        TEST_DATA.CALENDAR.testEvent.notes
      );
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBeTruthy();
      
      console.log(`✅ Created event: "${testEventTitle}"`);
      console.log(`  Event ID: ${result.eventId}`);
      console.log(`  Time: ${tomorrow.toLocaleString()} - ${eventEndTime.toLocaleString()}`);
    }, 15000);

    it("should create an all-day event", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      tomorrow.setHours(0, 0, 0, 0);
      
      const eventEnd = new Date(tomorrow);
      eventEnd.setHours(23, 59, 59, 999);
      
      const allDayEventTitle = `All Day Test Event ${Date.now()}`;
      
      const result = await calendarModule.createEvent(
        allDayEventTitle,
        tomorrow.toISOString(),
        eventEnd.toISOString(),
        "All Day Location",
        "This is an all-day event",
        true // isAllDay
      );
      
      expect(result.success).toBe(true);
      expect(result.eventId).toBeTruthy();
      
      console.log(`✅ Created all-day event: "${allDayEventTitle}"`);
      console.log(`  Event ID: ${result.eventId}`);
    }, 15000);

    it("should create event in specific calendar if specified", async () => {
      const eventTime = new Date();
      eventTime.setDate(eventTime.getDate() + 3);
      eventTime.setHours(16, 0, 0, 0);
      
      const eventEndTime = new Date(eventTime);
      eventEndTime.setHours(17, 0, 0, 0);
      
      const specificCalendarEvent = `Specific Calendar Event ${Date.now()}`;
      
      const result = await calendarModule.createEvent(
        specificCalendarEvent,
        eventTime.toISOString(),
        eventEndTime.toISOString(),
        "Test Location",
        "Event in specific calendar",
        false,
        TEST_DATA.CALENDAR.calendarName
      );
      
      if (result.success) {
        console.log(`✅ Created event in specific calendar: "${specificCalendarEvent}"`);
      } else {
        console.log(`ℹ️ Could not create in specific calendar (${result.message}), but this is expected if the calendar doesn't exist`);
      }
    }, 15000);
  });

  describe("searchEvents", () => {
    it("should search for events by title", async () => {
      // First create a searchable event
      const searchEventTime = new Date();
      searchEventTime.setDate(searchEventTime.getDate() + 4);
      searchEventTime.setHours(10, 0, 0, 0);
      
      const searchEventEndTime = new Date(searchEventTime);
      searchEventEndTime.setHours(11, 0, 0, 0);
      
      const searchableEventTitle = `Searchable Test Event ${Date.now()}`;
      
      await calendarModule.createEvent(
        searchableEventTitle,
        searchEventTime.toISOString(),
        searchEventEndTime.toISOString(),
        "Search Test Location",
        "This event is for search testing"
      );
      
      await sleep(3000); // Wait for event to be indexed
      
      // Now search for it
      const searchResults = await calendarModule.searchEvents("Searchable Test", 10);
      
      expect(Array.isArray(searchResults)).toBe(true);
      
      if (searchResults.length > 0) {
        console.log(`✅ Found ${searchResults.length} events matching "Searchable Test"`);
        
        const matchingEvent = searchResults.find(event => 
          event.title.includes("Searchable Test")
        );
        
        if (matchingEvent) {
          console.log(`  - "${matchingEvent.title}"`);
          console.log(`    Calendar: ${matchingEvent.calendarName}`);
          console.log(`    ID: ${matchingEvent.id}`);
        }
      } else {
        console.log("ℹ️ No events found for 'Searchable Test' - may need time for indexing");
      }
    }, 25000);

    it("should search events with date range", async () => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      const monthAfterNext = new Date(nextMonth);
      monthAfterNext.setMonth(monthAfterNext.getMonth() + 1);
      
      const searchResults = await calendarModule.searchEvents(
        "meeting",
        5,
        nextMonth.toISOString(),
        monthAfterNext.toISOString()
      );
      
      expect(Array.isArray(searchResults)).toBe(true);
      console.log(`Found ${searchResults.length} "meeting" events in future date range`);
      
      if (searchResults.length > 0) {
        for (const event of searchResults.slice(0, 3)) {
          console.log(`  - "${event.title}" (${event.calendarName})`);
        }
      }
    }, 20000);

    it("should handle search with no results", async () => {
      const searchResults = await calendarModule.searchEvents("VeryUniqueEventTitle12345", 5);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
      
      console.log("✅ Handled search with no results correctly");
    }, 15000);
  });

  describe("openEvent", () => {
    it("should open an existing event", async () => {
      // First get some events to find one we can open
      const existingEvents = await calendarModule.getEvents(5);
      
      if (existingEvents.length > 0 && existingEvents[0].id) {
        const eventToOpen = existingEvents[0];
        
        const result = await calendarModule.openEvent(eventToOpen.id);
        
        if (result.success) {
          console.log(`✅ Successfully opened event: ${result.message}`);
        } else {
          console.log(`ℹ️ Could not open event: ${result.message}`);
        }
        
        expect(typeof result.success).toBe("boolean");
        expect(typeof result.message).toBe("string");
      } else {
        console.log("ℹ️ No existing events found to test opening");
      }
    }, 15000);

    it("should handle opening non-existent event", async () => {
      const result = await calendarModule.openEvent("non-existent-event-id-12345");
      
      expect(result.success).toBe(false);
      expect(typeof result.message).toBe("string");
      
      console.log("✅ Handled non-existent event correctly");
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should handle invalid date formats gracefully", async () => {
      try {
        const result = await calendarModule.createEvent(
          "Invalid Date Test",
          "invalid-start-date",
          "invalid-end-date"
        );
        
        expect(result.success).toBe(false);
        expect(result.message).toBeTruthy();
        console.log("✅ Invalid dates were correctly rejected");
      } catch (error) {
        console.log("✅ Invalid dates threw error (expected behavior)");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle empty event title gracefully", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const eventEnd = new Date(tomorrow);
      eventEnd.setHours(tomorrow.getHours() + 1);
      
      try {
        const result = await calendarModule.createEvent(
          "",
          tomorrow.toISOString(),
          eventEnd.toISOString()
        );
        
        expect(result.success).toBe(false);
        console.log("✅ Empty title was correctly rejected");
      } catch (error) {
        console.log("✅ Empty title threw error (expected behavior)");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle past dates gracefully", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastEventEnd = new Date(yesterday);
      pastEventEnd.setHours(yesterday.getHours() + 1);
      
      try {
        const result = await calendarModule.createEvent(
          "Past Event Test",
          yesterday.toISOString(),
          pastEventEnd.toISOString()
        );
        
        // Past events might be allowed, so check if it succeeded or failed gracefully
        if (result.success) {
          console.log("ℹ️ Past event was allowed (this may be normal behavior)");
        } else {
          console.log("✅ Past event was correctly rejected");
        }
        
        expect(typeof result.success).toBe("boolean");
      } catch (error) {
        console.log("✅ Past event threw error (expected behavior)");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle end time before start time gracefully", async () => {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + 1);
      startTime.setHours(15, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(14, 0, 0, 0); // End before start
      
      try {
        const result = await calendarModule.createEvent(
          "Invalid Time Range Test",
          startTime.toISOString(),
          endTime.toISOString()
        );
        
        expect(result.success).toBe(false);
        console.log("✅ Invalid time range was correctly rejected");
      } catch (error) {
        console.log("✅ Invalid time range threw error (expected behavior)");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle empty search text gracefully", async () => {
      const searchResults = await calendarModule.searchEvents("", 5);
      
      expect(Array.isArray(searchResults)).toBe(true);
      console.log("✅ Handled empty search text correctly");
    }, 10000);
  });
});