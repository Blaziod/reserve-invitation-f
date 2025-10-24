import { NextRequest, NextResponse } from 'next/server';
import { getPendingReminders, updateReminder } from '@/utils/reminderStorage';
import { sendReminderEmail } from '@/utils/emailService';

// This endpoint is called by Vercel Cron Jobs
// It runs every minute to check for pending reminders
export async function GET(request: NextRequest) {
  try {
    // Optional: Add security check using CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const now = new Date();
    console.log('⏰ Vercel Cron job running at:', now.toISOString(), '(Local:', now.toString() + ')');
    
    // Get all pending reminders
    const pendingReminders = await getPendingReminders();
    
    if (pendingReminders.length > 0) {
      console.log(`Found ${pendingReminders.length} pending reminders to send.`);
      
      const results = [];
      
      // Process each pending reminder
      for (const reminder of pendingReminders) {
        try {
          // Send the reminder email
          const success = await sendReminderEmail({
            email: reminder.email,
            date: reminder.date,
            time: reminder.time,
          });
          
          if (success) {
            // Update the reminder as sent
            await updateReminder(reminder.id, { sentReminder: true });
            console.log(`✅ Sent reminder email to ${reminder.email} for ${reminder.date} ${reminder.time}`);
            results.push({ id: reminder.id, email: reminder.email, success: true });
          } else {
            console.error(`❌ Failed to send reminder email to ${reminder.email}`);
            results.push({ id: reminder.id, email: reminder.email, success: false });
          }
        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
          results.push({ id: reminder.id, email: reminder.email, success: false, error: String(error) });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Processed ${pendingReminders.length} reminders`,
        results,
        timestamp: now.toISOString()
      });
    } else {
      console.log('No pending reminders found.');
      return NextResponse.json({
        success: true,
        message: 'No pending reminders',
        timestamp: now.toISOString()
      });
    }
  } catch (error) {
    console.error('Error in Vercel cron job:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error processing reminders',
        error: String(error)
      },
      { status: 500 }
    );
  }
}

// Support POST requests as well for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
