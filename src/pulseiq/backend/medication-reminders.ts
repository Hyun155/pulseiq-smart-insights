import cron, { type ScheduledTask } from "node-cron";
import type { Pool, QueryResultRow } from "pg";

export type MedicationSchedule = {
  id: string;
  userId: string;
  medicationName: string;
  dosage: string;
  reminderTime: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type MedicationReminderMessage = {
  type: "medication.reminder";
  userId: string;
  scheduleId: string;
  text: string;
  medication: { name: string; dosage: string; reminderTime: string };
  occurredAt: string;
};

export type MedicationStore = {
  findDueSchedules(date: string, time: string): Promise<MedicationSchedule[]>;
};

export type ChatPublisher = {
  publish(message: MedicationReminderMessage): Promise<void>;
};

const mapSchedule = (row: QueryResultRow): MedicationSchedule => ({
  id: String(row["id"]),
  userId: String(row["user_id"]),
  medicationName: String(row["medication_name"]),
  dosage: String(row["dosage"]),
  reminderTime: String(row["reminder_time"]).slice(0, 5),
  startDate: String(row["start_date"]),
  endDate: String(row["end_date"]),
  isActive: Boolean(row["is_active"]),
});

export function createPostgresMedicationStore(pool: Pool): MedicationStore {
  return {
    async findDueSchedules(date, time) {
      const result = await pool.query(
        `SELECT id, user_id, medication_name, dosage, reminder_time, start_date, end_date, is_active
         FROM medication_schedules
         WHERE is_active = TRUE
           AND start_date <= $1::date
           AND end_date >= $1::date
           AND reminder_time = $2::time`,
        [date, time],
      );
      return result.rows.map(mapSchedule);
    },
  };
}

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const localTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

export async function runMedicationReminderTick(
  store: MedicationStore,
  publisher: ChatPublisher,
  now = new Date(),
): Promise<number> {
  const schedules = await store.findDueSchedules(localDate(now), localTime(now));
  let published = 0;
  for (const schedule of schedules) {
    const message: MedicationReminderMessage = {
      type: "medication.reminder",
      userId: schedule.userId,
      scheduleId: schedule.id,
      text: `💊 Time to take ${schedule.medicationName} - ${schedule.dosage}`,
      medication: {
        name: schedule.medicationName,
        dosage: schedule.dosage,
        reminderTime: schedule.reminderTime,
      },
      occurredAt: now.toISOString(),
    };
    await publisher.publish(message);
    published += 1;
  }
  return published;
}

export function startMedicationReminderJob(
  store: MedicationStore,
  publisher: ChatPublisher,
  logger: Pick<Console, "error"> = console,
): ScheduledTask {
  const task = cron.schedule("* * * * *", () => {
    void runMedicationReminderTick(store, publisher).catch((error: unknown) => {
      logger.error("[PulseIQ medication reminders] tick failed", error);
    });
  });
  return task;
}
