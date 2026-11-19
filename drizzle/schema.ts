import { pgTable, uuid, text, timestamp, bigint } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  size: text("size").notNull().default("0"),
  kind: text("kind").notNull().default("Document"),
  storagePath: text("storage_path").notNull(),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  question: text("question").notNull().default(""),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cahiersDecharges = pgTable("cahiers_decharges", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull(),
  userId: uuid("user_id").notNull(),
  sourceDocumentId: uuid("source_document_id"),
  title: text("title").notNull(),
  summary: text("summary"),
  generalInformation: text("general_information"),
  objectives: text("objectives"),
  scope: text("scope"),
  functionalRequirements: text("functional_requirements"),
  technicalRequirements: text("technical_requirements"),
  constraints: text("constraints"),
  timeline: text("timeline"),
  deliverables: text("deliverables"),
  analysisStatus: text("analysis_status").default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  plan: text("plan").notNull().default("basic"),
  paymentProvider: text("payment_provider").notNull().default("paypal"),
  paymentId: text("payment_id"),
  status: text("status").notNull().default("pending"),
  trialEndsAt: timestamp("trial_ends_at"),
  endsAt: timestamp("ends_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
