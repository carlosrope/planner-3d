import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { EventKind, EventStatus, MemberRole, OrgKind, ShareRole } from "../domain";
import type { DesignDoc, DesignerPlan, PropertyDetails } from "../designer/types";
import type { Layer, VenueKind, VenueSpec } from "../layout/types";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------------------------------------------------------------------------
// Tablas de Better Auth (mismos nombres de modelo y campo que espera la librería).

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

// ---------------------------------------------------------------------------
// Negocio

/** Un negocio: la empresa de una planner o un salón. */
export const organization = pgTable("organization", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind").$type<OrgKind>().notNull().default("planner"),
  /** Logo como data URL (imagen chica, se reduce en el navegador antes de subirla). */
  logoUrl: text("logo_url"),
  brandColor: text("brand_color"),
  /** WhatsApp de contacto para los clientes, solo dígitos con lada de país (52…). */
  whatsapp: text("whatsapp"),
  createdAt: createdAt(),
});

export const membership = pgTable(
  "membership",
  {
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<MemberRole>().notNull().default("owner"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index("membership_user_idx").on(t.userId)],
);

/** Salón modelado una sola vez; lo reutilizan todos sus eventos. */
export const venue = pgTable("venue", {
  id: id(),
  name: text("name").notNull(),
  /** Salón de eventos o casa (inmobiliaria): decide en qué sección aparece y qué se diseña. */
  kind: text("kind").$type<VenueKind>().notNull().default("salon"),
  city: text("city").notNull().default("Los Mochis"),
  /** El salón dueño del modelo, si es cliente. */
  ownerOrgId: text("owner_org_id").references(() => organization.id, { onDelete: "set null" }),
  /** Disponible para todas las planners (catálogo local). */
  isPublic: boolean("is_public").notNull().default(false),
  modelUrl: text("model_url"),
  spec: jsonb("spec").$type<VenueSpec>().notNull(),
  /** Plano para el diseñador (muros, puertas, cuartos en mm); sin él no se puede abrir el lugar. */
  plan: jsonb("plan").$type<DesignerPlan>(),
  version: integer("version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Planners a las que un salón les comparte su modelo. */
export const venueAccess = pgTable(
  "venue_access",
  {
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.orgId] })],
);

export const event = pgTable(
  "event",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "restrict" }),
    kind: text("kind").$type<EventKind>().notNull(),
    title: text("title").notNull(),
    clientNames: text("client_names"),
    eventDate: date("event_date"),
    guestCount: integer("guest_count"),
    /** Casas: ficha de la propiedad que ve el cliente (precio, m², recámaras…). */
    details: jsonb("details").$type<PropertyDetails>(),
    status: text("status").$type<EventStatus>().notNull().default("borrador"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("event_org_idx").on(t.orgId)],
);

/** Una distribución del evento o de la casa: "A", "B", "C"… con su descripción. */
export const layout = pgTable(
  "layout",
  {
    id: id(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("A"),
    note: text("note").notNull().default(""),
    recommended: boolean("recommended").notNull().default(false),
    position: integer("position").notNull().default(0),
    /** Estado del diseñador por planta (src/lib/designer/types.ts). */
    doc: jsonb("doc").$type<DesignDoc>().notNull(),
    revision: integer("revision").notNull().default(1),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("layout_event_idx").on(t.eventId)],
);

/** Links de solo lectura por rol (cliente, staff, proveedor, salón). */
export const shareLink = pgTable(
  "share_link",
  {
    token: text("token").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    layoutId: text("layout_id")
      .notNull()
      .references(() => layout.id, { onDelete: "cascade" }),
    role: text("role").$type<ShareRole>().notNull(),
    layers: jsonb("layers").$type<Layer[]>().notNull(),
    canComment: boolean("can_comment").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Imagen de vista previa del enlace (JPEG en data URL) para WhatsApp. */
    preview: text("preview"),
    createdAt: createdAt(),
  },
  (t) => [index("share_link_event_idx").on(t.eventId)],
);

/** Comentarios del cliente sobre un objeto o un punto del plano. */
export const comment = pgTable(
  "comment",
  {
    id: id(),
    layoutId: text("layout_id")
      .notNull()
      .references(() => layout.id, { onDelete: "cascade" }),
    objectId: text("object_id"),
    x: real("x"),
    z: real("z"),
    authorName: text("author_name").notNull(),
    body: text("body").notNull(),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("comment_layout_idx").on(t.layoutId)],
);
