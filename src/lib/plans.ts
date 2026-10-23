/**
 * Planes de Plantea por perfil: los usa /planes y la ventana de planes de una cuenta sin plan.
 * Cada plan dice a qué plan del pago corresponde (`pay`) y, para un salón, que primero se registra el lugar.
 */
// Precios confirmados por el usuario el 15 de octubre de 2026: en pesos, con IVA incluido.
// 23 de octubre de 2026: Casas es una sola oferta con tres puertas: desarrolladoras por proyecto, inmobiliarias casa por
// casa (las dos sin precio público) y dueños de casa con el plan Personal.
/** `quote`: sin precio publicado; se pide una propuesta por WhatsApp (el texto de `price` se muestra en lugar del monto). */
export type PlanCard = { name: string; price: string; points: string[]; featured?: boolean; quote?: boolean };
/** `intro`: una frase debajo del título del perfil (Casas: para quién y qué gana). */
export type Profile = { id: string; tab: string; title: string; intro?: string; plans: PlanCard[]; details: string[] };

export const PROFILES: Profile[] = [
  {
    id: "planner",
    tab: "Soy planner",
    title: "Planner u organizador de eventos",
    plans: [
      {
        name: "Pro",
        price: "$790",
        points: ["Eventos ilimitados en cualquier salón del catálogo", "Plano, 3D, invitados, proveedores y hojas para imprimir", "Enlace con tu marca y 5 códigos al mes para tus clientes"],
      },
      { name: "Ilimitado", price: "$999", featured: true, points: ["Códigos sin tope para tus clientes", "Eventos ilimitados en cualquier salón del catálogo", "Plano, 3D, invitados, proveedores y hojas para imprimir", "Enlace con tu marca para tus clientes"] },
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
        points: ["Tu salón en 3D desde tu plano, en el catálogo", "Eventos ilimitados con tu logo; invita a tus planners", "Solicitudes por WhatsApp y 10 códigos al mes para quienes rentan contigo"],
      },
      { name: "Ilimitado", price: "$999", featured: true, points: ["Códigos sin tope para quienes rentan contigo", "Tu salón en 3D desde tu plano, en el catálogo", "Eventos ilimitados con tu logo; invita a tus planners", "Solicitudes de informes por WhatsApp"] },
    ],
    details: ["Pro al año: $7,900 (pagas 10 meses).", "Cada salón adicional: $250 al mes.", "Convertimos tu salón desde tu plano; está incluido en el plan. En Los Mochis, si no tienes plano, lo medimos sin costo extra."],
  },
  {
    id: "casas",
    tab: "Casas",
    title: "Casas: tu casa en 3D, desde su plano",
    intro: "Para enseñarla, venderla o amueblarla desde el celular. El que va a comprar o a vivir ahí la ve como va a quedar, no vacía.",
    plans: [
      {
        name: "Construyes casas nuevas",
        price: "Precio por proyecto",
        quote: true,
        featured: true,
        points: [
          "Tus modelos en 3D desde tu AutoCAD, para que el comprador los recorra antes de que existan",
          "Amueblados o sin muebles, con pisos con precio y recorrido desde el celular",
          "Enlace con tu marca para asesores y compradores; en el catálogo con QR y solicitudes a tu WhatsApp",
          "Códigos para que cada comprador arme su casa sin pagar",
        ],
      },
      {
        name: "Vendes o rentas casas",
        price: "Precio por casa",
        quote: true,
        points: [
          "Casa por casa: tu cliente la ve amueblada antes de ir a visitarla",
          "Con el plano de la casa o sus medidas; en Los Mochis la medimos, fuera se cotiza",
          "Enlace con tu marca y tu WhatsApp para cada casa, y la casa en el catálogo",
        ],
      },
      {
        name: "Es tu casa · Personal",
        price: "$250",
        points: [
          "Amuebla tu casa, pruébale muebles y pisos y recórrela desde el celular",
          "Un proyecto activo a la vez y enlace para compartirlo con tu familia",
          "Si tu casa es un modelo que ya está en Plantea, empiezas hoy",
        ],
      },
    ],
    details: [
      "Construyes casas nuevas: lo convertimos nosotros desde tu AutoCAD; el precio depende del número de modelos y de plantas.",
      "Vendes o rentas casas: cada casa necesita su plano o sus medidas; con eso te decimos el precio por casa.",
      "Es tu casa y la compraste a una desarrolladora que está en Plantea: pídele tu código y no pagas. Si no está, mándanos su plano y te decimos cuánto cuesta ponerla en 3D.",
    ],
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

/** Mensaje de WhatsApp para pedir la propuesta del plan de Casas. */
export const CASAS_QUOTE_MESSAGE = "Hola, quiero una propuesta de Plantea para poner casas en 3D.";
