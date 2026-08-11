CREATE TYPE "public"."role" AS ENUM('viewer', 'player', 'chronicler', 'co-dm', 'overlord');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('npc', 'location', 'faction', 'item', 'session', 'lore', 'player_character', 'handout', 'rule');--> statement-breakpoint
CREATE TYPE "public"."handout_type" AS ENUM('letter', 'map', 'image', 'prop', 'tarokka');--> statement-breakpoint
CREATE TYPE "public"."item_rarity" AS ENUM('common', 'uncommon', 'rare', 'very-rare', 'legendary', 'artifact');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('region', 'settlement', 'building', 'dungeon', 'landmark', 'wilderness');--> statement-breakpoint
CREATE TYPE "public"."lore_category" AS ENUM('history', 'religion', 'rumour', 'prophecy', 'folklore', 'cosmology');--> statement-breakpoint
CREATE TYPE "public"."npc_status" AS ENUM('alive', 'dead', 'undead', 'missing', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."relation_kind" AS ENUM('located_in', 'member_of', 'leads', 'allied_with', 'opposes', 'owns', 'appears_in', 'parent_of', 'related_to');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'player', 'dm');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "role",
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "entity_kind" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text DEFAULT '' NOT NULL,
	"visibility" "visibility" DEFAULT 'player' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relation" "relation_kind" NOT NULL,
	"note" text,
	"visibility" "visibility" DEFAULT 'player' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faction" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"motto" text,
	"headquarters_location_id" uuid,
	"leader_npc_id" uuid,
	"stated_goals" text,
	"true_goals" text,
	"secrets" text
);
--> statement-breakpoint
CREATE TABLE "game_session" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"session_number" integer NOT NULL,
	"played_on" timestamp with time zone,
	"recap" text,
	"dm_notes" text
);
--> statement-breakpoint
CREATE TABLE "handout" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"handout_type" "handout_type" NOT NULL,
	"asset_url" text,
	"revealed_at" timestamp with time zone,
	"secrets" text
);
--> statement-breakpoint
CREATE TABLE "item" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"rarity" "item_rarity" DEFAULT 'common' NOT NULL,
	"requires_attunement" boolean DEFAULT false NOT NULL,
	"owner_npc_id" uuid,
	"location_id" uuid,
	"properties" text,
	"curse" text,
	"secrets" text
);
--> statement-breakpoint
CREATE TABLE "location" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"location_type" "location_type" NOT NULL,
	"parent_location_id" uuid,
	"map_url" text,
	"approach" text,
	"secrets" text,
	"dm_notes" text
);
--> statement-breakpoint
CREATE TABLE "lore" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"category" "lore_category" NOT NULL,
	"source" text,
	"is_accurate" boolean,
	"secrets" text
);
--> statement-breakpoint
CREATE TABLE "npc" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"epithet" text,
	"status" "npc_status" DEFAULT 'unknown' NOT NULL,
	"location_id" uuid,
	"faction_id" uuid,
	"portrait_url" text,
	"true_allegiance" text,
	"secrets" text,
	"stat_block" text
);
--> statement-breakpoint
CREATE TABLE "player_character" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"player_user_id" text,
	"ancestry" text,
	"character_class" text,
	"level" integer DEFAULT 1 NOT NULL,
	"backstory" text,
	"dm_hooks" text
);
--> statement-breakpoint
CREATE TABLE "rule" (
	"entity_id" uuid PRIMARY KEY NOT NULL,
	"replaces" text,
	"mechanics" text,
	"dm_guidance" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"actor_role" "role" NOT NULL,
	"impersonated_by" text,
	"action" text NOT NULL,
	"subject_kind" text NOT NULL,
	"subject_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_kind" "entity_kind" NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"author_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity" ADD CONSTRAINT "entity_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_link" ADD CONSTRAINT "entity_link_from_entity_id_entity_id_fk" FOREIGN KEY ("from_entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_link" ADD CONSTRAINT "entity_link_to_entity_id_entity_id_fk" FOREIGN KEY ("to_entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faction" ADD CONSTRAINT "faction_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faction" ADD CONSTRAINT "faction_headquarters_location_id_entity_id_fk" FOREIGN KEY ("headquarters_location_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faction" ADD CONSTRAINT "faction_leader_npc_id_entity_id_fk" FOREIGN KEY ("leader_npc_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_session" ADD CONSTRAINT "game_session_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "handout" ADD CONSTRAINT "handout_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_owner_npc_id_entity_id_fk" FOREIGN KEY ("owner_npc_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_location_id_entity_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_parent_location_id_entity_id_fk" FOREIGN KEY ("parent_location_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lore" ADD CONSTRAINT "lore_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc" ADD CONSTRAINT "npc_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc" ADD CONSTRAINT "npc_location_id_entity_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "npc" ADD CONSTRAINT "npc_faction_id_entity_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."entity"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_character" ADD CONSTRAINT "player_character_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_character" ADD CONSTRAINT "player_character_player_user_id_user_id_fk" FOREIGN KEY ("player_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule" ADD CONSTRAINT "rule_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_impersonated_by_user_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision" ADD CONSTRAINT "revision_entity_id_entity_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entity"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision" ADD CONSTRAINT "revision_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_kind_slug_idx" ON "entity" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "entity_kind_idx" ON "entity" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "entity_visibility_published_idx" ON "entity" USING btree ("visibility","published");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_link_unique_idx" ON "entity_link" USING btree ("from_entity_id","to_entity_id","relation");--> statement-breakpoint
CREATE INDEX "entity_link_from_idx" ON "entity_link" USING btree ("from_entity_id");--> statement-breakpoint
CREATE INDEX "entity_link_to_idx" ON "entity_link" USING btree ("to_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_number_idx" ON "game_session" USING btree ("session_number");--> statement-breakpoint
CREATE INDEX "npc_faction_idx" ON "npc" USING btree ("faction_id");--> statement-breakpoint
CREATE INDEX "npc_location_idx" ON "npc" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_kind","subject_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "revision_entity_version_idx" ON "revision" USING btree ("entity_id","version");--> statement-breakpoint
CREATE INDEX "revision_entity_idx" ON "revision" USING btree ("entity_id");