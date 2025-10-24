/**
 * Check database timezone configuration
 * Run with: node scripts/check-db-timezone.js
 */

import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace('channel_binding=require', ''),
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkTimezone() {
  try {
    console.log('\n=== PostgreSQL Timezone Check ===\n');
    
    // Check database timezone
    const tzResult = await pool.query("SHOW timezone");
    console.log('Database Timezone:', tzResult.rows[0].TimeZone);
    
    // Check current time in database
    const nowResult = await pool.query("SELECT NOW(), CURRENT_TIMESTAMP, LOCALTIMESTAMP");
    console.log('\nDatabase Times:');
    console.log('  NOW():', nowResult.rows[0].now);
    console.log('  CURRENT_TIMESTAMP:', nowResult.rows[0].current_timestamp);
    console.log('  LOCALTIMESTAMP:', nowResult.rows[0].localtimestamp);
    
    // Test timestamp parsing
    const testTime = '2025-10-24 10:10';
    const parseResult = await pool.query(`
      SELECT 
        $1::timestamp as "asTimestamp",
        $1::timestamptz as "asTimestamptz",
        EXTRACT(EPOCH FROM $1::timestamp) as "timestampEpoch",
        EXTRACT(EPOCH FROM NOW()) as "currentEpoch"
    `, [testTime]);
    
    console.log(`\nTest: "${testTime}" parsed as:`);
    console.log('  timestamp:', parseResult.rows[0].asTimestamp);
    console.log('  timestamptz:', parseResult.rows[0].asTimestamptz);
    console.log('  Reminder Epoch:', parseResult.rows[0].timestampEpoch);
    console.log('  Current Epoch:', parseResult.rows[0].currentEpoch);
    console.log('  Is Past:', parseResult.rows[0].timestampEpoch <= parseResult.rows[0].currentEpoch);
    
    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTimezone();
