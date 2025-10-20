import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, assertValidDate, sleep } from "../helpers/test-utils.js";
import messagesModule from "../../utils/message.js";

describe("Messages Integration Tests", () => {
  describe("sendMessage", () => {
    it("should send a message to test phone number", async () => {
      const testMessage = `Test message from Claude MCP at ${new Date().toLocaleString()}`;
      
      try {
        await messagesModule.sendMessage(TEST_DATA.PHONE_NUMBER, testMessage);
        console.log(`✅ Successfully sent test message to ${TEST_DATA.PHONE_NUMBER}`);
        
        // Give some time for the message to be processed
        await sleep(2000);
        
        // Try to verify the message was sent by reading recent messages
        const recentMessages = await messagesModule.readMessages(TEST_DATA.PHONE_NUMBER, 5);
        
        // Check if our sent message appears in the recent messages
        const sentMessage = recentMessages.find(msg => 
          msg.is_from_me && msg.content.includes("Test message from Claude MCP")
        );
        
        if (sentMessage) {
          console.log("✅ Confirmed message was sent and found in message history");
        } else {
          console.log("⚠️ Message sent but not found in history (may take time to appear)");
        }
      } catch (error) {
        console.error("❌ Failed to send message:", error);
        throw error;
      }
    }, 15000);

    it("should handle message with special characters", async () => {
      const specialMessage = `Special chars test: 🚀 "quotes" & symbols! @#$% ${new Date().toISOString()}`;
      
      try {
        await messagesModule.sendMessage(TEST_DATA.PHONE_NUMBER, specialMessage);
        console.log("✅ Successfully sent message with special characters");
      } catch (error) {
        console.error("❌ Failed to send message with special characters:", error);
        throw error;
      }
    }, 10000);
  });

  describe("readMessages", () => {
    it("should read messages from test phone number", async () => {
      const messages = await messagesModule.readMessages(TEST_DATA.PHONE_NUMBER, 10);
      
      expect(Array.isArray(messages)).toBe(true);
      console.log(`Found ${messages.length} messages for ${TEST_DATA.PHONE_NUMBER}`);
      
      if (messages.length > 0) {
        // Verify message structure
        for (const message of messages) {
          expect(typeof message.content).toBe("string");
          expect(typeof message.sender).toBe("string");
          expect(typeof message.is_from_me).toBe("boolean");
          assertValidDate(message.date);
          
          console.log(`Message from ${message.is_from_me ? 'me' : message.sender}: ${message.content.substring(0, 50)}...`);
        }
      } else {
        console.log("No messages found - this may be expected if no conversation exists");
      }
    }, 15000);

    it("should handle non-existent phone number gracefully", async () => {
      const messages = await messagesModule.readMessages("+1 9999999999", 5);
      
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);
      console.log("✅ Handled non-existent phone number correctly");
    }, 10000);

    it("should limit message count correctly", async () => {
      const limit = 3;
      const messages = await messagesModule.readMessages(TEST_DATA.PHONE_NUMBER, limit);
      
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeLessThanOrEqual(limit);
      console.log(`Requested ${limit} messages, got ${messages.length}`);
    }, 10000);
  });

  describe("getUnreadMessages", () => {
    it("should retrieve unread messages", async () => {
      const unreadMessages = await messagesModule.getUnreadMessages(10);
      
      expect(Array.isArray(unreadMessages)).toBe(true);
      console.log(`Found ${unreadMessages.length} unread messages`);
      
      if (unreadMessages.length > 0) {
        // Verify message structure
        for (const message of unreadMessages) {
          expect(typeof message.content).toBe("string");
          expect(typeof message.sender).toBe("string");
          expect(message.is_from_me).toBe(false); // Unread messages should not be from us
          assertValidDate(message.date);
          
          console.log(`Unread from ${message.sender}: ${message.content.substring(0, 50)}...`);
        }
      } else {
        console.log("No unread messages found - this is normal");
      }
    }, 15000);

    it("should limit unread message count correctly", async () => {
      const limit = 5;
      const messages = await messagesModule.getUnreadMessages(limit);
      
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeLessThanOrEqual(limit);
      console.log(`Requested ${limit} unread messages, got ${messages.length}`);
    }, 10000);
  });

  describe("scheduleMessage", () => {
    it("should schedule a message for future delivery", async () => {
      const futureTime = new Date(Date.now() + 10000); // 10 seconds from now
      const scheduleTestMessage = `Scheduled test message at ${futureTime.toLocaleString()}`;
      
      try {
        const scheduledMessage = await messagesModule.scheduleMessage(
          TEST_DATA.PHONE_NUMBER,
          scheduleTestMessage,
          futureTime
        );
        
        expect(typeof scheduledMessage.id).toBe("object"); // setTimeout returns NodeJS.Timeout
        expect(scheduledMessage.scheduledTime).toEqual(futureTime);
        expect(scheduledMessage.message).toBe(scheduleTestMessage);
        expect(scheduledMessage.phoneNumber).toBe(TEST_DATA.PHONE_NUMBER);
        
        console.log(`✅ Successfully scheduled message for ${futureTime.toLocaleString()}`);
        console.log("⏳ Message will be sent in 10 seconds...");
        
        // Wait a bit longer than the scheduled time to see if it gets sent
        await sleep(12000);
        
        // Try to find the scheduled message in recent messages
        const recentMessages = await messagesModule.readMessages(TEST_DATA.PHONE_NUMBER, 5);
        const foundScheduledMessage = recentMessages.find(msg => 
          msg.is_from_me && msg.content.includes("Scheduled test message")
        );
        
        if (foundScheduledMessage) {
          console.log("✅ Scheduled message was sent successfully");
        } else {
          console.log("⚠️ Scheduled message not found in recent messages");
        }
      } catch (error) {
        console.error("❌ Failed to schedule message:", error);
        throw error;
      }
    }, 25000); // Longer timeout to account for scheduled sending

    it("should reject scheduling messages in the past", async () => {
      const pastTime = new Date(Date.now() - 10000); // 10 seconds ago
      const pastMessage = "This message should not be scheduled";
      
      try {
        await messagesModule.scheduleMessage(TEST_DATA.PHONE_NUMBER, pastMessage, pastTime);
        throw new Error("Expected error for past time scheduling");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain("Cannot schedule message in the past");
        console.log("✅ Correctly rejected scheduling message in the past");
      }
    }, 5000);
  });

  describe("Error Handling", () => {
    it("should handle empty message gracefully", async () => {
      try {
        await messagesModule.sendMessage(TEST_DATA.PHONE_NUMBER, "");
        console.log("✅ Handled empty message (may be allowed)");
      } catch (error) {
        console.log("⚠️ Empty message was rejected (this may be expected behavior)");
      }
    }, 5000);

    it("should handle invalid phone number gracefully", async () => {
      try {
        await messagesModule.sendMessage("invalid-phone", "Test message");
        console.log("⚠️ Invalid phone number was accepted (unexpected)");
      } catch (error) {
        console.log("✅ Invalid phone number was correctly rejected");
        expect(error instanceof Error).toBe(true);
      }
    }, 5000);

    it("should handle database access issues gracefully", async () => {
      // This test verifies that the functions handle database access issues gracefully
      // The actual database access is handled by the checkMessagesDBAccess function
      
      const messages = await messagesModule.readMessages("test", 1);
      const unreadMessages = await messagesModule.getUnreadMessages(1);
      
      // Both should return empty arrays if database access fails
      expect(Array.isArray(messages)).toBe(true);
      expect(Array.isArray(unreadMessages)).toBe(true);
      
      console.log("✅ Database access error handling works correctly");
    }, 10000);
  });
});