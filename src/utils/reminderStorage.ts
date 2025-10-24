import pool, { initializeDatabase, queryWithRetries } from './dbClient';

// Define the reminder data structure
export interface ReminderData {
  id: string;
  email: string;
  date: string;
  time: string;
  sentConfirmation: boolean;
  sentReminder: boolean;
  createdAt: string;
}

// Initialize the database when this module is imported
initializeDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
});

// Get all reminders
export const getAllReminders = async (): Promise<ReminderData[]> => {
  try {
    // Use queryWithRetries to handle potential connection issues
    const result = await queryWithRetries(() => 
      pool.query(`
        SELECT 
          id::text, 
          email, 
          date, 
          time, 
          sent_confirmation as "sentConfirmation", 
          sent_reminder as "sentReminder", 
          created_at::text as "createdAt" 
        FROM reminders
      `),
      5,  // 5 retries
      2000 // 2 seconds initial delay (longer than default)
    );

    if (!result || !result.rows) {
      console.error('Database returned invalid result when getting all reminders');
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error('Error getting reminders from database:', error);
    return [];
  }
};

// Add a new reminder
export const addReminder = async (reminderData: Omit<ReminderData, 'id' | 'sentConfirmation' | 'sentReminder' | 'createdAt'>): Promise<ReminderData> => {
  try {
    const { email, date, time } = reminderData;

    // Use queryWithRetries to handle potential connection issues
    const result = await queryWithRetries(() => 
      pool.query(`
        INSERT INTO reminders (email, date, time, sent_confirmation, sent_reminder)
        VALUES ($1, $2, $3, false, false)
        RETURNING 
          id::text, 
          email, 
          date, 
          time, 
          sent_confirmation as "sentConfirmation", 
          sent_reminder as "sentReminder", 
          created_at::text as "createdAt"
      `, [email, date, time]),
      3,  // 3 retries
      1000 // 1 second initial delay
    );

    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('Database returned empty result when adding reminder');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error adding reminder to database:', error);
    // Rethrow with additional context
    if (error instanceof Error) {
      error.message = `Database error when adding reminder: ${error.message}`;
    }
    throw error;
  }
};

// Update a reminder
export const updateReminder = async (id: string, updates: Partial<ReminderData>): Promise<ReminderData | null> => {
  try {
    // Build the SET part of the query dynamically based on the updates
    const updateFields: string[] = [];
    const values = [id];
    let valueIndex = 2;

    if (updates.sentConfirmation !== undefined) {
      updateFields.push(`sent_confirmation = $${valueIndex}`);
      values.push(String(updates.sentConfirmation));
      valueIndex++;
    }

    if (updates.sentReminder !== undefined) {
      updateFields.push(`sent_reminder = $${valueIndex}`);
      values.push(String(updates.sentReminder));
      valueIndex++;
    }

    // If no fields to update, return null
    if (updateFields.length === 0) {
      return null;
    }

    // Use queryWithRetries to handle potential connection issues
    const result = await queryWithRetries(() => 
      pool.query(`
        UPDATE reminders
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING 
          id::text, 
          email, 
          date, 
          time, 
          sent_confirmation as "sentConfirmation", 
          sent_reminder as "sentReminder", 
          created_at::text as "createdAt"
      `, values),
      5,  // 5 retries
      2000 // 2 seconds initial delay (longer than default)
    );

    if (!result || !result.rows) {
      throw new Error('Database returned invalid result when updating reminder');
    }

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error updating reminder in database:', error);
    // Rethrow with additional context
    if (error instanceof Error) {
      error.message = `Database error when updating reminder: ${error.message}`;
    }
    throw error;
  }
};

// Get pending reminders that need to be sent
export const getPendingReminders = async (): Promise<ReminderData[]> => {
  try {
    // Get the current time
    const now = new Date();
    const nowISO = now.toISOString();
    
    console.log('🔍 Checking for pending reminders...');
    console.log('Current time (UTC):', nowISO);
    console.log('Current time (local):', now.toString());

    
    const result = await queryWithRetries(() => 
      pool.query(`
        SELECT 
          id::text, 
          email, 
          date, 
          time, 
          sent_confirmation as "sentConfirmation", 
          sent_reminder as "sentReminder", 
          created_at::text as "createdAt",
          (date || ' ' || time)::timestamp as "reminderTimestamp",
          NOW() as "currentTime",
          EXTRACT(EPOCH FROM (date || ' ' || time)::timestamp) as "reminderEpoch",
          EXTRACT(EPOCH FROM NOW()) as "currentEpoch",
          EXTRACT(EPOCH FROM (date || ' ' || time)::timestamp) <= EXTRACT(EPOCH FROM NOW()) as "isPast"
        FROM reminders
        WHERE sent_reminder = false
      `, []),
      5,  // 5 retries
      2000 // 2 seconds initial delay (longer than default)
    );

    if (!result || !result.rows) {
      console.error('Database returned invalid result when getting pending reminders');
      return [];
    }

    // Log all reminders for debugging
    console.log(`Total unsent reminders found: ${result.rows.length}`);
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Email: ${row.email}, Reminder: ${row.date} ${row.time}`);
      console.log(`    Reminder Time: ${row.reminderTimestamp}`);
      console.log(`    Current Time: ${row.currentTime}`);
      console.log(`    Reminder Epoch: ${row.reminderEpoch}, Current Epoch: ${row.currentEpoch}`);
      console.log(`    Is Past Due: ${row.isPast}`);
    });

    // Filter for those that are actually past due
    const pendingReminders = result.rows.filter(row => row.isPast);
    console.log(`✅ Pending reminders to send: ${pendingReminders.length}`);

    return pendingReminders;
  } catch (error) {
    console.error('Error getting pending reminders from database:', error);
    
    return [];
  }
};

// Get reminders that need confirmation emails
export const getUnconfirmedReminders = async (): Promise<ReminderData[]> => {
  try {
    // Use queryWithRetries to handle potential connection issues
    const result = await queryWithRetries(() => 
      pool.query(`
        SELECT 
          id::text, 
          email, 
          date, 
          time, 
          sent_confirmation as "sentConfirmation", 
          sent_reminder as "sentReminder", 
          created_at::text as "createdAt"
        FROM reminders
        WHERE sent_confirmation = false
      `),
      5,  // 5 retries
      2000 // 2 seconds initial delay (longer than default)
    );

    if (!result || !result.rows) {
      console.error('Database returned invalid result when getting unconfirmed reminders');
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error('Error getting unconfirmed reminders from database:', error);
    // Don't throw the error, just return an empty array to prevent the cron job from failing
    return [];
  }
};
