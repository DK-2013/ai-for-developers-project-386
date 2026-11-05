import { asc } from "drizzle-orm";
import type {
  CreateMeetingTypeRequest,
  MeetingType,
} from "../generated/models/all/call-calendar.js";
import { meetingTypes, type Database } from "../db/schema.js";

type MeetingTypeRow = typeof meetingTypes.$inferSelect;

function toMeetingType(row: MeetingTypeRow): MeetingType {
  const meetingType: MeetingType = {
    id: row.id,
    name: row.name,
    durationMinutes: row.durationMinutes,
  };

  if (row.description !== null) {
    meetingType.description = row.description;
  }

  return meetingType;
}

export type MeetingTypeRepository = {
  create(input: CreateMeetingTypeRequest): Promise<MeetingType>;
  list(): Promise<MeetingType[]>;
};

export function createMeetingTypeRepository(db: Database): MeetingTypeRepository {
  return {
    async create(input) {
      const values: typeof meetingTypes.$inferInsert = {
        name: input.name,
        durationMinutes: input.durationMinutes,
      };

      if (input.description !== undefined) {
        values.description = input.description;
      }

      const rows = await db.insert(meetingTypes).values(values).returning();
      const row = rows.at(0);

      if (row === undefined) {
        throw new Error("Create meeting type: insert returned no row");
      }

      return toMeetingType(row);
    },

    async list() {
      const rows = await db
        .select()
        .from(meetingTypes)
        .orderBy(asc(meetingTypes.createdAt), asc(meetingTypes.id));

      return rows.map(toMeetingType);
    },
  };
}
