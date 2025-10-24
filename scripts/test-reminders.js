/**
 * Test script to check reminder times and timezone handling
 * Run with: node scripts/test-reminders.js
 */

// Example reminder data from your database
const testReminder = {
  date: "2025-10-24",
  time: "03:33"
};

console.log("\n=== Reminder Timezone Test ===\n");

// Show what time the reminder is set for
console.log("Stored reminder:");
console.log(`  Date: ${testReminder.date}`);
console.log(`  Time: ${testReminder.time}`);

// Create timestamp as if it's UTC (by appending 'Z')
const asUTC = new Date(`${testReminder.date}T${testReminder.time}Z`);
console.log("\nInterpreted as UTC (with 'Z' appended):");
console.log(`  UTC: ${asUTC.toISOString()}`);
console.log(`  Your Local Time: ${asUTC.toString()}`);

// Create timestamp as local time
const asLocal = new Date(`${testReminder.date}T${testReminder.time}`);
console.log("\nInterpreted as Local Time (no 'Z'):");
console.log(`  UTC: ${asLocal.toISOString()}`);
console.log(`  Your Local Time: ${asLocal.toString()}`);

// Show current time
const now = new Date();
console.log("\nCurrent Time:");
console.log(`  UTC: ${now.toISOString()}`);
console.log(`  Your Local Time: ${now.toString()}`);
console.log(`  Your Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
console.log(`  Timezone Offset: UTC${now.getTimezoneOffset() > 0 ? '-' : '+'}${Math.abs(now.getTimezoneOffset() / 60)}`);

// Check if reminder should trigger (as UTC)
console.log("\n=== Comparison (UTC) ===");
console.log(`  Reminder Time (UTC): ${asUTC.toISOString()}`);
console.log(`  Current Time (UTC):  ${now.toISOString()}`);
console.log(`  Should Send: ${asUTC <= now ? '✅ YES' : '❌ NO'}`);

// Check if reminder should trigger (as local)
console.log("\n=== Comparison (Local) ===");
console.log(`  Reminder Time (UTC): ${asLocal.toISOString()}`);
console.log(`  Current Time (UTC):  ${now.toISOString()}`);
console.log(`  Should Send: ${asLocal <= now ? '✅ YES' : '❌ NO'}`);

console.log("\n=== Recommendation ===");
console.log("When user selects time in browser:");
console.log("  - HTML <input type='time'> returns LOCAL time (e.g., '03:33')");
console.log("  - We need to store it with timezone info OR");
console.log("  - Store as UTC by converting from local time");
console.log("\n");
