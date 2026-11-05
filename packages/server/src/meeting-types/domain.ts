/** A validated meeting type before persistence assigns its id. */
export type NewMeetingType = {
  name: string;
  description?: string;
  durationMinutes: number;
};

/** A meeting type as stored in the database. */
export type MeetingType = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
};
