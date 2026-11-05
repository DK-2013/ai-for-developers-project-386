-- Custom migration: Drizzle cannot express extensions or exclusion constraints.
-- The GiST exclusion constraint is the source of truth for booking overlaps.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings"
	ADD CONSTRAINT "bookings_no_overlap"
	EXCLUDE USING gist (tstzrange("start_at", "end_at", '[)') WITH &&);
