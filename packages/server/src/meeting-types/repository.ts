import { asc, eq } from "drizzle-orm";
import { meetingTypes, type Database } from "../db/schema.js";
import type { MeetingType, NewMeetingType } from "./domain.js";

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
  create(input: NewMeetingType): Promise<MeetingType>;
  findById(id: string): Promise<MeetingType | undefined>;
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

    async findById(id) {
      let rows: MeetingTypeRow[];

      try {
        rows = await db.select().from(meetingTypes).where(eq(meetingTypes.id, id));
      } catch (error) {
        throw new Error("Find meeting type by id: query failed", { cause: error });
      }

      const row = rows.at(0);

      return row === undefined ? undefined : toMeetingType(row);
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
