/**
 * Planes de Plantea por perfil: los usa /planes y la ventana de planes de una cuenta sin plan.
 * Cada plan dice a qué plan del pago corresponde (`pay`) y, para un salón, que primero se registra el lugar.
 */
// Precios confirmados por el usuario el 15 de octubre de 2026: en pesos, con IVA incluido.
export type PlanCard = { name: string; price: string; points: string[]; featured?: boolean };
export type Profile = { id: string; tab: string; title: string; plans: PlanCard[]; details: string[] };

export const PROFILES: Profile[] = [
  {
    id: "planner",
    tab: "Soy planner",
    title: "Planner u organizador de eventos",
    plans: [
      {
        name: "Pro",
        price: "$790",
        featured: true,
        points: ["Eventos ilimitados en cualquier salón del catálogo", "Plano, 3D, invitados, proveedores y hojas para imprimir", "Enlace con tu marca y 5 códigos al mes para tus clientes"],
      },
      { name: "Ilimitado", price: "$999", points: ["Códigos sin tope para tus clientes", "Eventos ilimitados en cualquier salón del catálogo", "Plano, 3D, invitados, proveedores y hojas para imprimir", "Enlace con tu marca para tus clientes"] },
    ],
    details: ["Pro al año: $7,900 (pagas 10 meses).", "Hasta 3 personas de tu equipo en la misma cuenta."],
  },
  {
    id: "salon",
    tab: "Tengo un salón",
    title: "Salón de eventos",
    plans: [
      {
        name: "Pro",
        price: "$790",
        featured: true,
        points: ["Tu salón en 3D desde tu plano, en el catálogo", "Eventos ilimitados con tu logo; invita a tus planners", "Solicitudes por WhatsApp y 10 códigos al mes para quienes rentan contigo"],
      },
      { name: "Ilimitado", price: "$999", points: ["Códigos sin tope para quienes rentan contigo", "Tu salón en 3D desde tu plano, en el catálogo", "Eventos ilimitados con tu logo; invita a tus planners", "Solicitudes de informes por WhatsApp"] },
    ],
    details: ["Pro al año: $7,900 (pagas 10 meses).", "Cada salón adicional: $250 al mes.", "Convertimos tu salón desde tu plano; está incluido en el plan. En Los Mochis, si no tienes plano, lo medimos sin costo extra."],
  },
  {
    id: "casas",
    tab: "Vendo casas",
    title: "Inmobiliarias y desarrolladoras",
    plans: [
      {
        name: "Inmobiliaria o asesor",
        price: "$690",
        featured: true,
        points: ["Las casas del catálogo con tu marca", "Amuebladas o sin muebles, pisos con precio y recorrido", "Enlace para tu cliente con tu WhatsApp"],
      },
      { name: "Desarrolladora o constructora", price: "$790", points: ["Tu modelo de casa en 3D desde tu CAD", "En el catálogo, con enlaces para tus asesores y compradores"] },
    ],
    details: ["Al año: inmobiliaria $6,900 · desarrolladora $7,900.", "Casa propia desde plano (inmobiliaria): $250 cada una.", "Cada modelo adicional (desarrolladora): $250 al mes."],
  },
];


/** Para la ventana de planes: quien organiza su propia fiesta (en /planes va como nota al pie). */
export const PERSONAL_PROFILE: Profile = {
  id: "personal",
  tab: "Organizo mi fiesta",
  title: "Organizo mi propia fiesta",
  plans: [{ name: "Personal", price: "$250", featured: true, points: ["Un evento activo a la vez en cualquier salón del catálogo", "Plano, 3D, invitados por mesa y enlace para tu familia"] }],
  details: ["Si tu salón te dio un código, úsalo al crear tu cuenta: tu evento no te cuesta."],
};

/** Plan que se paga en Mi negocio según el perfil elegido. */
export const PAY_PLAN: Record<string, "eventos" | "casas" | "personal"> = { planner: "eventos", salon: "eventos", casas: "casas", personal: "personal" };
