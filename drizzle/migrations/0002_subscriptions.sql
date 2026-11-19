CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" text DEFAULT 'basic' NOT NULL,
	"payment_provider" text DEFAULT 'paypal' NOT NULL,
	"payment_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"trial_ends_at" timestamp,
	"ends_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
