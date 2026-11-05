import { meetingTypes, type Database } from "./schema.js";

/** Stable id so repeated seeds address the same meeting type. */
const DEFAULT_MEETING_TYPE_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Seeds the meeting type every install starts with, so a Guest can book
 * without the Owner creating a type first.
 */
export async function seedDefaultMeetingType(db: Database): Promise<void> {
  await db
    .insert(meetingTypes)
    .values({
      id: DEFAULT_MEETING_TYPE_ID,
      name: "Звонок",
      description: "Стандартный звонок",
      durationMinutes: 15,
    })
    .onConflictDoNothing({ target: meetingTypes.id });
}
