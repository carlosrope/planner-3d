import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
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
import type {
  AuditAction,
  EventKind,
  EventStatus,
  Layer,
  MemberRole,
  OrgKind,
  PaymentPeriod,
  PaymentStatus,
  Plan,
  Section,
  ShareRole,
  Tier,
  VenueKind,
  VenueStatus,
} from "../domain";
import type { DesignDoc, DesignerPlan, PropertyDetails } from "../designer/types";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
/** Archivo binario (planos, fotos y comprobantes se guardan en la base; no hay almacenamiento de archivos aparte). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
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
  /** Módulos contratados: las secciones que ve la cuenta (`salones`, `casas`). */
  modules: jsonb("modules")
    .$type<Section[]>()
    .notNull()
    .default(sql`'["salones","casas"]'::jsonb`),
  /** Plan comercial; `prueba` vence en `planEndsAt`. */
  plan: text("plan").$type<Plan>().notNull().default("ambos"),
  /** Fin del plan; vacío = no vence. Al vencer, la cuenta ve sus proyectos pero no puede crear ni editar. */
  planEndsAt: timestamp("plan_ends_at", { withTimezone: true }),
  /** Pro (códigos con tope al mes) o Ilimitado. */
  tier: text("tier").$type<Tier>().notNull().default("pro"),
  /** Cuenta creada con un código de referido: el código que la abrió (dice el lugar y quién la invitó). */
  referralCodeId: text("referral_code_id"),
  /** Idioma del diseñador para este negocio y sus enlaces ("es" o "en"); se elige en Mi negocio. */
  language: text("language").notNull().default("es"),
  /** Mensaje propio para mandar los códigos por WhatsApp (vacío = el sugerido; src/lib/referral-message.ts). */
  referralMessage: text("referral_message"),
  createdAt: createdAt(),
});

/**
 * Código de referido: el dueño de un salón (o una planner) lo genera para un cliente que renta el salón;
 * con él, el cliente crea su cuenta y arma un solo evento en ese lugar sin pagar.
 */
export const referralCode = pgTable(
  "referral_code",
  {
    id: id(),
    /** Legible y de un solo uso, por ejemplo PALMAS-7K3M. */
    code: text("code").notNull().unique(),
    /** Quien lo dio: el negocio del salón o la planner. */
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "cascade" }),
    /** Para quién es (nombre del cliente y fecha del evento, como los apuntó quien lo dio). */
    guestName: text("guest_name").notNull(),
    eventDate: date("event_date"),
    /** La cuenta que lo usó y el evento que armó. */
    usedByOrgId: text("used_by_org_id").references(() => organization.id, { onDelete: "set null" }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    eventId: text("event_id").references(() => event.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("referral_code_org_idx").on(t.orgId), index("referral_code_venue_idx").on(t.venueId)],
);

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
  /** Dirección legible del catálogo (/lugares/[slug]); vacío en lugares viejos: se usa el id. */
  slug: text("slug").unique(),
  /** Ciclo del lugar: en conversión → por confirmar → publicado (o retirado). */
  status: text("status").$type<VenueStatus>().notNull().default("publicado"),
  /** El salón dueño del modelo, si es cliente. */
  ownerOrgId: text("owner_org_id").references(() => organization.id, { onDelete: "set null" }),
  /** Disponible para todas las planners (catálogo local). */
  isPublic: boolean("is_public").notNull().default(false),
  /** Ficha pública: aforo (salones), m² construidos (casas), dirección y descripción. */
  capacity: integer("capacity"),
  areaM2: real("area_m2"),
  address: text("address"),
  description: text("description"),
  /** Contacto del dueño que registró el lugar (WhatsApp solo dígitos con lada de país). */
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  /** Lo que el dueño nos dijo al registrarlo (columnas, zonas, lo que hay que saber). */
  notes: text("notes"),
  /** Enlace privado para que el dueño revise y confirme su lugar (/revisar/[token]). */
  reviewToken: text("review_token").unique(),
  /** Correcciones que pidió el dueño al revisar. */
  reviewNotes: text("review_notes"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  /** Veces que se abrió el 3D público del lugar. */
  viewCount: integer("view_count").notNull().default(0),
  modelUrl: text("model_url"),
  /** Sin uso: era el plano del editor anterior (ya se quitó). Queda vacío ({}) porque la columna es obligatoria. */
  spec: jsonb("spec").$type<Record<string, unknown>>().notNull(),
  /** Plano para el diseñador (muros, puertas, cuartos en mm); sin él no se puede abrir el lugar. */
  plan: jsonb("plan").$type<DesignerPlan>(),
  version: integer("version").notNull().default(1),
  /** Papelera: se oculta en todas partes y se borra de verdad a los 30 días (TRASH_DAYS). */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Archivos de un lugar: el plano que sube el dueño (CAD, PDF o foto del croquis), sus fotos y la portada
 * automática (`render`: vista 3D y plano 2D que la app captura al confirmar el lugar; va al final, en
 * position 1000+, para que las fotos reales ganen como portada). */
export const venueFile = pgTable(
  "venue_file",
  {
    id: id(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"plano" | "foto" | "render">().notNull(),
    name: text("name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    data: bytea("data").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("venue_file_venue_idx").on(t.venueId)],
);

/** Solicitud de informes que deja alguien desde la ficha pública del lugar. */
export const venueInquiry = pgTable(
  "venue_inquiry",
  {
    id: id(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venue.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    eventDate: date("event_date"),
    guests: integer("guests"),
    message: text("message").notNull().default(""),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("venue_inquiry_venue_idx").on(t.venueId)],
);

/** Pago por transferencia: el negocio sube su comprobante y la administración lo confirma (activa el plan) o lo rechaza. */
export const payment = pgTable(
  "payment",
  {
    id: id(),
    orgId: text("org_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    plan: text("plan").$type<Plan>().notNull(),
    period: text("period").$type<PaymentPeriod>().notNull(),
    /** Pesos, como lo escribió el cliente. */
    amount: integer("amount").notNull(),
    receiptName: text("receipt_name").notNull(),
    receiptType: text("receipt_type").notNull(),
    receipt: bytea("receipt").notNull(),
    status: text("status").$type<PaymentStatus>().notNull().default("pendiente"),
    /** Nota de la administración al confirmar o rechazar. */
    note: text("note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("payment_org_idx").on(t.orgId)],
);

/**
 * Rastro de lo que cuesta dinero o cambia lo público: quién confirmó o rechazó un pago, cambió un plan, publicó,
 * retiró o mandó a la papelera un lugar. Solo se agrega; nunca se edita ni se borra.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    /** Quién lo hizo (vacío: el dueño desde su enlace de revisión, o una cuenta ya borrada). */
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    /** Correo o descripción de quién lo hizo, guardado tal cual (sobrevive a que se borre la cuenta). */
    actor: text("actor").notNull(),
    action: text("action").$type<AuditAction>().notNull(),
    targetType: text("target_type").$type<"payment" | "organization" | "venue" | "setting">().notNull(),
    targetId: text("target_id").notNull(),
    /** Nombre legible del negocio o del lugar al momento del cambio. */
    targetLabel: text("target_label").notNull(),
    /** Antes y después, monto, nota… */
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt), index("audit_log_target_idx").on(t.targetType, t.targetId)],
);

/** Ajustes de la app (sin uso desde el 16 de octubre de 2026: la interfaz del diseñador quedó fija en el código). */
export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
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
    /** Papelera: se oculta en todas partes y se borra de verdad a los 30 días (TRASH_DAYS). */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
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
    /** Veces que una persona abrió el enlace (sin contar las vistas previas de WhatsApp y los buscadores). */
    viewCount: integer("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
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
