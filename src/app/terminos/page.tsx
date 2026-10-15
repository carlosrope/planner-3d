import type { Metadata } from "next";
import Link from "next/link";
import { Legal, RESPONSABLE, Seccion } from "@/components/Legal";
import { PRICES_URL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Términos de servicio",
  description: "Las reglas de Plantea: cuentas, planes y pagos, códigos de referido, tu contenido y el catálogo de lugares.",
};

const li = "list-disc space-y-1 pl-5";

export default function TerminosPage() {
  return (
    <Legal
      tag="Plantea · Legal"
      title="Términos de servicio"
      updated="14 de octubre de 2026"
      intro={
        <p>
          <b>En corto:</b> Plantea es una herramienta para planear eventos y mostrar casas en 2D y 3D. Tu contenido (planos, fotos, eventos) sigue siendo
          tuyo; nos das permiso solo para operar Plantea. Los planes se pagan por adelantado y se pueden cancelar cuando quieras. Los planos son un apoyo
          para planear: confirma siempre las medidas y la capacidad con el lugar.
        </p>
      }
    >
      <Seccion n="1" title="Quién presta el servicio y qué aceptas">
        <p>
          Plantea es operada por <b>{RESPONSABLE.nombre}</b> bajo la marca <b>{RESPONSABLE.marca}</b>, en {RESPONSABLE.ciudad}. Al crear una cuenta, registrar
          un lugar o usar la aplicación aceptas estos términos y el{" "}
          <Link href="/privacidad" className="underline">
            Aviso de privacidad
          </Link>
          . Si usas Plantea a nombre de un negocio, declaras que puedes obligarlo.
        </p>
      </Seccion>

      <Seccion n="2" title="Qué es Plantea">
        <p>
          Una aplicación web para acomodar mesas, muebles e invitados sobre el plano real de un salón o una casa, verlo en 3D, generar hojas para imprimir
          y compartir enlaces de solo vista. Incluye un catálogo público de lugares que sus dueños autorizaron publicar.
        </p>
        <p>
          <b>La demostración</b> (salón y casa de ejemplo) es gratuita y no requiere cuenta; lo que haces ahí se guarda solo en tu navegador.
        </p>
      </Seccion>

      <Seccion n="3" title="Tu cuenta">
        <ul className={li}>
          <li>Necesitas ser mayor de 18 años y dar un correo real: es el único medio para recuperar tu acceso y recibir avisos.</li>
          <li>Tu contraseña es tuya; no la compartas. Lo que se haga con tu cuenta se entiende hecho por ti.</li>
          <li>Puedes invitar a personas de tu equipo o a planners según lo que permita tu plan; tú respondes por lo que hagan en tu cuenta o en tu lugar.</li>
          <li>Podemos suspender una cuenta que use Plantea para dañar a otros, violar la ley, abusar del sistema o incumplir estos términos.</li>
        </ul>
      </Seccion>

      <Seccion n="4" title="Planes, pagos y cancelación">
        <ul className={li}>
          <li>
            Los planes, lo que incluye cada uno y sus precios se publican en{" "}
            <a href={PRICES_URL} className="underline" target="_blank" rel="noopener">
              prolink365.com.mx/espacios-3d
            </a>
            . La aplicación no muestra precios.
          </li>
          <li>El plan se paga por adelantado, por mes o por año, por transferencia (SPEI). Queda activo cuando confirmamos el pago, normalmente el mismo día hábil. Emitimos factura CFDI.</li>
          <li>Precio fijo durante 12 meses desde tu primer pago. Si cambia después, te avisaremos con 30 días de anticipación.</li>
          <li>
            <b>Garantía:</b> si en los primeros 15 días de tu primera mensualidad Plantea no te sirve, te devolvemos ese pago. Después no hay reembolsos por
            periodos no usados.
          </li>
          <li>No hay plazo forzoso: puedes dejar de pagar cuando quieras. Al vencer el plan, tus proyectos siguen guardados y visibles, pero no se pueden crear ni editar hasta reactivar.</li>
          <li>Plan de prueba: dura los días que indique tu código de invitación, sin costo y sin tarjeta.</li>
        </ul>
      </Seccion>

      <Seccion n="5" title="Códigos de referido y cuentas con código">
        <ul className={li}>
          <li>
            Con un plan vigente, un salón o una planner puede generar códigos para sus clientes, hasta el tope mensual de su plan. Cada código es para{" "}
            <b>una persona y un evento</b> en ese lugar.
          </li>
          <li>
            Quien entra con un código obtiene una cuenta sin costo para armar ese evento, vigente hasta 30 días después de la fecha del evento (o 90 días
            si no tiene fecha). Después, la cuenta y el evento pueden borrarse.
          </li>
          <li>Los códigos no se venden ni se publican abiertamente; el salón o la planner los dan a sus propios clientes.</li>
          <li>Si quien dio el código deja de pagar, los eventos ya creados siguen hasta su vencimiento; solo dejan de emitirse códigos nuevos.</li>
        </ul>
      </Seccion>

      <Seccion n="6" title="Tu contenido: planos, fotos y proyectos">
        <p>
          <b>Todo lo que subes sigue siendo tuyo.</b> Nos das una licencia limitada, no exclusiva y revocable para almacenarlo, convertirlo al modelo
          2D/3D y mostrarlo únicamente dentro de Plantea, según la configuración que elijas. Para tu plano aplica además la sección 4 del Aviso de
          privacidad: <b>solo se usa para Plantea</b>, no se cede, no se vende y se borra si retiras tu lugar.
        </p>
        <ul className={li}>
          <li>Declaras que tienes derecho a subir el plano y las fotos (eres el dueño del lugar o tienes su permiso).</li>
          <li>Los modelos 2D/3D que produce Plantea a partir de tu plano los puedes usar libremente mientras tengas cuenta; el software, los catálogos de mobiliario y el diseño de la aplicación son de {RESPONSABLE.marca}.</li>
          <li>Si capturas datos de otras personas (invitados, clientes), tú eres responsable de tener su autorización.</li>
        </ul>
      </Seccion>

      <Seccion n="7" title="Catálogo público de lugares">
        <ul className={li}>
          <li>Al registrar un lugar aceptas que {RESPONSABLE.marca} lo convierta y, si marcaste la casilla, lo publique en el catálogo con sus fotos, ficha y 3D de solo vista.</li>
          <li>No hay exclusividad: puedes estar en otros catálogos y retirarte de este cuando quieras con 30 días de aviso (la ficha deja de verse de inmediato).</li>
          <li>Tú respondes por la exactitud de aforo, dirección y descripción; podemos corregir o retirar fichas con información falsa o contenido indebido.</li>
          <li>Las solicitudes de informes que recibes desde tu ficha son de tus clientes: úsalas solo para atenderlos.</li>
        </ul>
      </Seccion>

      <Seccion n="8" title="Lo que no se puede hacer">
        <ul className={li}>
          <li>Subir planos o fotos que no sean tuyos o que no tengas permiso de usar.</li>
          <li>Copiar, revender o extraer los modelos, catálogos o datos de otros lugares de Plantea.</li>
          <li>Intentar acceder a cuentas o datos ajenos, saturar el servicio o evadir sus límites (por ejemplo, revender códigos).</li>
          <li>Usar Plantea para contenido ilegal, ofensivo o que dañe a terceros.</li>
        </ul>
      </Seccion>

      <Seccion n="9" title="Disponibilidad, respaldos y cambios">
        <p>
          Trabajamos para que Plantea esté disponible siempre, pero no podemos garantizar que nunca falle: hay mantenimientos, caídas de proveedores y
          errores. Hacemos respaldos de la base de datos; aun así, te recomendamos descargar tus hojas en PDF antes de cada evento. Podemos mejorar o
          cambiar funciones; si quitamos algo importante para tu plan, te avisaremos con anticipación.
        </p>
      </Seccion>

      <Seccion n="10" title="Alcance de la responsabilidad">
        <p>
          Plantea es un apoyo para planear. Los modelos se construyen a partir de los planos o croquis que entrega cada lugar, y <b>las medidas y aforos
          pueden variar respecto a la realidad</b>: confirma siempre con el lugar antes de contratar mobiliario, proveedores o invitar gente. {RESPONSABLE.marca}{" "}
          no participa en la contratación entre tú y el lugar, ni responde por lo que ocurra en el evento, ni por decisiones tomadas con base en el modelo.
          En cualquier caso, nuestra responsabilidad máxima se limita a lo que pagaste por Plantea en los últimos 12 meses.
        </p>
      </Seccion>

      <Seccion n="11" title="Terminación">
        <p>
          Puedes cerrar tu cuenta cuando quieras escribiendo a {RESPONSABLE.correo}; borraremos tus datos conforme al Aviso de privacidad. Nosotros
          podemos terminar el servicio a una cuenta que incumpla estos términos, avisando salvo en casos graves.
        </p>
      </Seccion>

      <Seccion n="12" title="Ley aplicable y contacto">
        <p>
          Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales
          competentes de Los Mochis, Sinaloa, renunciando a cualquier otro fuero. Antes de eso, escríbenos: casi todo se resuelve en un mensaje.
          Contacto: {RESPONSABLE.correo} · WhatsApp {RESPONSABLE.whatsapp}.
        </p>
      </Seccion>
    </Legal>
  );
}
