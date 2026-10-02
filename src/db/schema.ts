import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { TrainingPlan, UserProfile } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Better Auth tables                                                  */
/* (RLS on, no policies: blocks Supabase's public REST API; the app    */
/* connects as the table owner, which RLS does not restrict)           */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}).enableRLS();

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

/* ------------------------------------------------------------------ */
/* Gymora tables                                                       */
/* ------------------------------------------------------------------ */

/** Everything collected during onboarding (editable from the profile tab). */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<UserProfile>().notNull(),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}).enableRLS();

export const trainingPlans = pgTable(
  "training_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** ai | imported | manual */
    source: text("source").notNull().default("ai"),
    isActive: boolean("is_active").notNull().default(false),
    plan: jsonb("plan").$type<TrainingPlan>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("training_plans_user_idx").on(t.userId)],
).enableRLS();

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => trainingPlans.id, { onDelete: "set null" }),
    dayIndex: integer("day_index").notNull(),
    dayTitle: text("day_title").notNull(),
    /** active | completed | abandoned */
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endedAt: timestamp("ended_at"),
    totalSeconds: integer("total_seconds").notNull().default(0),
    workSeconds: integer("work_seconds").notNull().default(0),
    restSeconds: integer("rest_seconds").notNull().default(0),
    cardioSeconds: integer("cardio_seconds").notNull().default(0),
    /** Session RPE 1-10 */
    sessionRpe: integer("session_rpe"),
    notes: text("notes"),
  },
  (t) => [index("workout_sessions_user_idx").on(t.userId, t.startedAt)],
).enableRLS();

export const sessionSets = pgTable(
  "session_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseIndex: integer("exercise_index").notNull(),
    exerciseName: text("exercise_name").notNull(),
    muscleGroup: text("muscle_group").notNull(),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps").notNull(),
    weightKg: real("weight_kg").notNull().default(0),
    rir: real("rir"),
    /** Time spent performing the set */
    workSeconds: integer("work_seconds").notNull().default(0),
    /** Rest taken right before this set */
    restSeconds: integer("rest_seconds").notNull().default(0),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (t) => [index("session_sets_session_idx").on(t.sessionId)],
).enableRLS();

export const cardioEntries = pgTable("cardio_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => workoutSessions.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  seconds: integer("seconds").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

export const bodyWeights = pgTable(
  "body_weights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weightKg: real("weight_kg").notNull(),
    measuredAt: timestamp("measured_at").notNull().defaultNow(),
  },
  (t) => [index("body_weights_user_idx").on(t.userId, t.measuredAt)],
).enableRLS();
