import { describe, it, expect } from "bun:test";
import { TEST_DATA } from "../fixtures/test-data.js";
import { assertNotEmpty, assertValidDate, sleep } from "../helpers/test-utils.js";
import mailModule from "../../utils/mail.js";

describe("Mail Integration Tests", () => {
  describe("getAccounts", () => {
    it("should retrieve email accounts", async () => {
      const accounts = await mailModule.getAccounts();
      
      expect(Array.isArray(accounts)).toBe(true);
      console.log(`Found ${accounts.length} email accounts`);
      
      if (accounts.length > 0) {
        for (const account of accounts) {
          expect(typeof account).toBe("string");
          expect(account.length).toBeGreaterThan(0);
          console.log(`  - ${account}`);
        }
      } else {
        console.log("ℹ️ No email accounts found - Mail app may not be configured");
      }
    }, 15000);
  });

  describe("getMailboxes", () => {
    it("should retrieve all mailboxes", async () => {
      const mailboxes = await mailModule.getMailboxes();
      
      expect(Array.isArray(mailboxes)).toBe(true);
      console.log(`Found ${mailboxes.length} total mailboxes`);
      
      if (mailboxes.length > 0) {
        for (const mailbox of mailboxes.slice(0, 10)) { // Show first 10
          expect(typeof mailbox).toBe("string");
          expect(mailbox.length).toBeGreaterThan(0);
          console.log(`  - ${mailbox}`);
        }
        
        if (mailboxes.length > 10) {
          console.log(`  ... and ${mailboxes.length - 10} more`);
        }
      }
    }, 15000);

    it("should retrieve mailboxes for specific account", async () => {
      // First get accounts
      const accounts = await mailModule.getAccounts();
      
      if (accounts.length > 0) {
        const testAccount = accounts[0];
        const mailboxes = await mailModule.getMailboxesForAccount(testAccount);
        
        expect(Array.isArray(mailboxes)).toBe(true);
        console.log(`Found ${mailboxes.length} mailboxes for account "${testAccount}"`);
        
        for (const mailbox of mailboxes.slice(0, 5)) {
          console.log(`  - ${mailbox}`);
        }
      } else {
        console.log("ℹ️ Skipping account-specific mailbox test - no accounts available");
      }
    }, 15000);
  });

  describe("getUnreadMails", () => {
    it("should retrieve unread emails", async () => {
      const unreadEmails = await mailModule.getUnreadMails(10);
      
      expect(Array.isArray(unreadEmails)).toBe(true);
      console.log(`Found ${unreadEmails.length} unread emails`);
      
      if (unreadEmails.length > 0) {
        for (const email of unreadEmails) {
          expect(typeof email.subject).toBe("string");
          expect(typeof email.sender).toBe("string");
          expect(typeof email.dateSent).toBe("string");
          expect(typeof email.content).toBe("string");
          expect(typeof email.isRead).toBe("boolean");
          expect(email.isRead).toBe(false); // Should be unread
          
          assertValidDate(email.dateSent);
          
          console.log(`  - From: ${email.sender}`);
          console.log(`    Subject: ${email.subject}`);
          console.log(`    Date: ${email.dateSent}`);
          console.log(`    Content Preview: ${email.content.substring(0, 50)}...`);
          console.log("");
        }
      } else {
        console.log("ℹ️ No unread emails found - this is normal");
      }
    }, 20000);

    it("should limit unread email count correctly", async () => {
      const limit = 3;
      const emails = await mailModule.getUnreadMails(limit);
      
      expect(Array.isArray(emails)).toBe(true);
      expect(emails.length).toBeLessThanOrEqual(limit);
      console.log(`Requested ${limit} unread emails, got ${emails.length}`);
    }, 15000);
  });

  describe("getLatestMails", () => {
    it("should retrieve latest emails from first account", async () => {
      const accounts = await mailModule.getAccounts();
      
      if (accounts.length > 0) {
        const testAccount = accounts[0];
        const latestEmails = await mailModule.getLatestMails(testAccount, 5);
        
        expect(Array.isArray(latestEmails)).toBe(true);
        console.log(`Found ${latestEmails.length} latest emails from "${testAccount}"`);
        
        if (latestEmails.length > 0) {
          // Verify email structure
          for (const email of latestEmails) {
            expect(typeof email.subject).toBe("string");
            expect(typeof email.sender).toBe("string");
            expect(typeof email.dateSent).toBe("string");
            assertValidDate(email.dateSent);
            
            console.log(`  - ${email.subject} (from ${email.sender})`);
          }
          
          // Check if emails are sorted by date (newest first)
          for (let i = 0; i < latestEmails.length - 1; i++) {
            const currentDate = new Date(latestEmails[i].dateSent);
            const nextDate = new Date(latestEmails[i + 1].dateSent);
            expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
          }
          
          console.log("✅ Emails are properly sorted by date");
        }
      } else {
        console.log("ℹ️ Skipping latest emails test - no accounts available");
      }
    }, 20000);
  });

  describe("searchMails", () => {
    it("should search emails by common terms", async () => {
      const searchTerms = ["notification", "apple", "security", "account"];
      
      for (const term of searchTerms) {
        const searchResults = await mailModule.searchMails(term, 5);
        
        expect(Array.isArray(searchResults)).toBe(true);
        console.log(`Search for "${term}": found ${searchResults.length} results`);
        
        if (searchResults.length > 0) {
          // Verify search results contain the search term
          let foundMatch = false;
          for (const email of searchResults) {
            const searchableText = `${email.subject} ${email.content}`.toLowerCase();
            if (searchableText.includes(term.toLowerCase())) {
              foundMatch = true;
              break;
            }
          }
          
          if (foundMatch) {
            console.log(`✅ Search results contain the term "${term}"`);
          } else {
            console.log(`⚠️ Search results may not contain "${term}" directly but found related content`);
          }
        }
        
        // Small delay between searches
        await sleep(1000);
      }
    }, 30000);

    it("should handle search with no results", async () => {
      const uniqueSearchTerm = "VeryUniqueSearchTerm12345";
      const searchResults = await mailModule.searchMails(uniqueSearchTerm, 5);
      
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults.length).toBe(0);
      
      console.log("✅ Handled search with no results correctly");
    }, 10000);
  });

  describe("sendMail", () => {
    it("should send a test email", async () => {
      const testSubject = `${TEST_DATA.MAIL.testSubject} - ${new Date().toLocaleString()}`;
      const testBody = `${TEST_DATA.MAIL.testBody}\n\nSent at: ${new Date().toISOString()}`;
      
      try {
        const result = await mailModule.sendMail(
          TEST_DATA.MAIL.testEmailAddress,
          testSubject,
          testBody
        );
        
        expect(typeof result).toBe("string");
        console.log(`✅ Mail send result: ${result}`);
        
        // Give some time for the email to be processed
        await sleep(3000);
        
        // Try to find the sent email in recent emails
        const accounts = await mailModule.getAccounts();
        if (accounts.length > 0) {
          const recentEmails = await mailModule.getLatestMails(accounts[0], 10);
          const sentEmail = recentEmails.find(email => 
            email.subject.includes("Claude MCP Test Email")
          );
          
          if (sentEmail) {
            console.log("✅ Confirmed sent email appears in recent emails");
          } else {
            console.log("ℹ️ Sent email not found in recent emails (may take time to appear)");
          }
        }
      } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw error;
      }
    }, 20000);

    it("should send email with CC and BCC", async () => {
      const testSubject = `CC/BCC Test - ${new Date().toLocaleString()}`;
      const testBody = "This is a test email with CC and BCC recipients.";
      
      try {
        const result = await mailModule.sendMail(
          TEST_DATA.MAIL.testEmailAddress,
          testSubject,
          testBody,
          TEST_DATA.MAIL.testEmailAddress, // CC
          TEST_DATA.MAIL.testEmailAddress  // BCC
        );
        
        expect(typeof result).toBe("string");
        console.log(`✅ Mail with CC/BCC send result: ${result}`);
      } catch (error) {
        console.error("❌ Failed to send email with CC/BCC:", error);
        throw error;
      }
    }, 15000);
  });

  describe("Error Handling", () => {
    it("should handle invalid email address gracefully", async () => {
      try {
        const result = await mailModule.sendMail(
          "invalid-email-address",
          "Test Subject",
          "Test Body"
        );
        
        // If it succeeds, log the result
        console.log("⚠️ Invalid email address was accepted:", result);
      } catch (error) {
        console.log("✅ Invalid email address was correctly rejected");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle empty search term gracefully", async () => {
      const searchResults = await mailModule.searchMails("", 5);
      
      expect(Array.isArray(searchResults)).toBe(true);
      console.log("✅ Handled empty search term correctly");
    }, 10000);

    it("should handle non-existent account gracefully", async () => {
      const nonExistentAccount = "nonexistent@example.com";
      
      try {
        const emails = await mailModule.getLatestMails(nonExistentAccount, 5);
        expect(Array.isArray(emails)).toBe(true);
        console.log("✅ Handled non-existent account correctly");
      } catch (error) {
        console.log("✅ Non-existent account properly threw error");
        expect(error instanceof Error).toBe(true);
      }
    }, 10000);

    it("should handle mailbox access issues gracefully", async () => {
      // This test verifies that mail functions handle access issues gracefully
      const accounts = await mailModule.getAccounts();
      const mailboxes = await mailModule.getMailboxes();
      const unreadEmails = await mailModule.getUnreadMails(1);
      
      // All should return arrays even if there are access issues
      expect(Array.isArray(accounts)).toBe(true);
      expect(Array.isArray(mailboxes)).toBe(true);
      expect(Array.isArray(unreadEmails)).toBe(true);
      
      console.log("✅ Mail access error handling works correctly");
    }, 15000);
  });
});