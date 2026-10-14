import type { Metadata } from "next";
import Link from "next/link";
import { Legal, RESPONSABLE, Seccion } from "@/components/Legal";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Qué datos guarda Plantea, para qué los usa y cómo puedes ejercer tus derechos. Tu plano solo se usa para tu 3D en Plantea.",
};

const li = "list-disc space-y-1 pl-5";

export default function PrivacidadPage() {
  return (
    <Legal
      tag="Plantea · Legal"
      title="Aviso de privacidad"
      updated="14 de octubre de 2026"
      intro={
        <p>
          <b>En corto:</b> Plantea guarda lo mínimo para que funcione tu cuenta, tu lugar y tus eventos. <b>El plano de tu salón o de tu casa
          solo se usa para convertirlo al 2D/3D de Plantea y mostrarlo como tú decidas.</b> No se vende, no se cede y no se usa para nada más. Tus
          datos no se usan para publicidad. Puedes pedir que se corrija o se borre todo escribiendo a {RESPONSABLE.correo}.
        </p>
      }
    >
      <Seccion n="1" title="Quién es responsable de tus datos">
        <p>
          El responsable del tratamiento de los datos personales que recaba Plantea es <b>{RESPONSABLE.nombre}</b>, que opera bajo la marca{" "}
          <b>{RESPONSABLE.marca}</b>, con domicilio en {RESPONSABLE.ciudad}. Contacto para todo lo relacionado con este aviso: {RESPONSABLE.correo} o WhatsApp{" "}
          {RESPONSABLE.whatsapp}. Este aviso se emite conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su
          Reglamento.
        </p>
        <p>
          Plantea es la aplicación que vive en este sitio y en sus dominios asociados. Los demás servicios de ProLink365 tienen su propio aviso en{" "}
          <a href="https://prolink365.com.mx/privacidad.html" className="underline" target="_blank" rel="noopener">
            prolink365.com.mx/privacidad
          </a>
          .
        </p>
      </Seccion>

      <Seccion n="2" title="Qué datos recabamos">
        <p>Solo los que tú o tu equipo capturan al usar Plantea:</p>
        <ul className={li}>
          <li>
            <b>Tu cuenta:</b> nombre, correo electrónico y contraseña. La contraseña se guarda cifrada con un algoritmo de una sola vía: nadie, ni nosotros,
            puede leerla.
          </li>
          <li>
            <b>Tu negocio:</b> nombre, logotipo, color y número de WhatsApp que eliges mostrar en los enlaces que compartes con tus clientes.
          </li>
          <li>
            <b>Tu lugar (salón, casa o modelo):</b> nombre, dirección, ciudad, aforo o metros, descripción, fotos, <b>el plano o croquis con medidas</b> y el
            nombre, teléfono y correo de contacto que nos das para coordinar la conversión.
          </li>
          <li>
            <b>Tus eventos y proyectos:</b> nombre del evento, fecha, número de invitados, nombre del cliente si lo escribes, y la distribución de mesas y
            muebles. Si usas la lista de invitados, los nombres, grupos y notas de dieta o alergia que tú captures.
          </li>
          <li>
            <b>Solicitudes de informes:</b> cuando alguien pide informes desde la ficha pública de un lugar, guardamos su nombre, teléfono, fecha e
            invitados aproximados y mensaje, para entregárselos al lugar.
          </li>
          <li>
            <b>Pagos:</b> el comprobante de transferencia que subes (imagen o PDF), el plan y el monto. No guardamos números de tarjeta: Plantea no procesa
            tarjetas.
          </li>
          <li>
            <b>Códigos de referido:</b> el nombre del cliente y la fecha del evento que escribe quien genera el código, y qué cuenta lo usó.
          </li>
          <li>
            <b>Datos técnicos:</b> dirección IP y tipo de navegador de cada sesión (para seguridad de la cuenta), cookies de sesión y, en el 3D público de
            un lugar, el conteo de aperturas. No usamos cookies de publicidad.
          </li>
        </ul>
        <p>
          Las notas de dieta o alergia de tus invitados pueden ser datos sensibles. Las capturas tú, bajo tu responsabilidad, y solo se usan para las hojas
          de montaje y de meseros de tu propio evento.
        </p>
      </Seccion>

      <Seccion n="3" title="Para qué los usamos">
        <ul className={li}>
          <li>Crear y proteger tu cuenta, y recordarte cuando vence tu plan.</li>
          <li>Convertir tu plano al 2D y 3D de Plantea, y publicar tu lugar en el catálogo si lo autorizaste.</li>
          <li>Guardar tus eventos y proyectos, generar hojas para imprimir y los enlaces de solo vista que decidas compartir.</li>
          <li>Entregar al lugar las solicitudes de informes que recibe desde su ficha.</li>
          <li>Confirmar tus pagos, activar tu plan y emitir tu factura.</li>
          <li>Atenderte por WhatsApp o correo cuando nos escribes.</li>
        </ul>
        <p>
          <b>No usamos tus datos para publicidad</b>, no armamos perfiles comerciales y no se los vendemos ni rentamos a nadie. Si algún día quisiéramos
          usarlos para algo distinto, te lo pediríamos antes y por separado.
        </p>
      </Seccion>

      <Seccion n="4" title="Tu plano: solo para Plantea">
        <p>
          El plano, croquis, archivo CAD o fotos que nos mandas de tu lugar son tuyos. Nos los entregas únicamente para que{" "}
          <b>{RESPONSABLE.marca} los convierta al modelo 2D/3D de Plantea</b> y ese modelo se muestre donde tú decidas: en tu cuenta, en el enlace y QR
          de tu lugar y, si lo autorizaste al registrarlo, en el catálogo público.
        </p>
        <ul className={li}>
          <li>No vendemos, cedemos, publicamos en otros sitios ni reutilizamos tu plano para ningún otro producto, cliente o fin.</li>
          <li>No lo usamos para entrenar modelos de inteligencia artificial.</li>
          <li>Solo lo ven las personas de {RESPONSABLE.marca} que hacen la conversión y el soporte.</li>
          <li>
            Si retiras tu lugar, el modelo deja de verse de inmediato en el catálogo y en su enlace, y el plano original y las fotos se borran de nuestros
            servidores en un plazo máximo de 30 días. Los eventos que otras personas ya habían creado ahí conservan su distribución, sin tus archivos.
          </li>
        </ul>
      </Seccion>

      <Seccion n="5" title="Con quién se comparten">
        <p>Únicamente con los proveedores que hacen posible el servicio, y solo para eso:</p>
        <ul className={li}>
          <li>
            <b>Hospedaje y base de datos:</b> Railway (Estados Unidos), donde viven la aplicación y sus datos cifrados en tránsito.
          </li>
          <li>
            <b>Enlaces que tú compartes:</b> cuando mandas un enlace de solo vista o el QR de tu lugar, quien lo abra verá lo que ese enlace muestra (el
            diseño, tu marca, el nombre del evento). Tú decides a quién se lo mandas.
          </li>
          <li>
            <b>Lugares del catálogo:</b> el lugar recibe la solicitud de informes que tú envías desde su ficha, con tus datos de contacto.
          </li>
        </ul>
        <p>
          Fuera de eso, solo compartiríamos datos si una autoridad competente lo exige por ley. Si en el futuro agregamos un proveedor (por ejemplo,
          correo transaccional o pagos con tarjeta), actualizaremos este aviso.
        </p>
      </Seccion>

      <Seccion n="6" title="Cuánto tiempo los guardamos">
        <ul className={li}>
          <li>Cuenta, negocio y proyectos: mientras tu cuenta exista. Si pides borrarla, se elimina todo en un plazo máximo de 30 días.</li>
          <li>Cuentas con código de referido: hasta 30 días después de la fecha del evento (o 90 días si no tiene fecha); después se pueden borrar.</li>
          <li>Lugares retirados: plano y fotos, 30 días; la ficha deja de ser pública de inmediato.</li>
          <li>Comprobantes de pago: el tiempo que exige la ley fiscal (5 años).</li>
          <li>Solicitudes de informes: hasta 12 meses, para el reporte del lugar.</li>
        </ul>
      </Seccion>

      <Seccion n="7" title="Tus derechos (ARCO)">
        <p>
          Puedes <b>acceder</b> a tus datos, <b>rectificarlos</b>, <b>cancelarlos</b> u <b>oponerte</b> a su uso, y también revocar el consentimiento o
          pedir la portabilidad de tus proyectos. Escribe a {RESPONSABLE.correo} desde el correo de tu cuenta, indicando qué pides. Respondemos en un
          máximo de 20 días hábiles. Gran parte lo puedes hacer tú: tu nombre, logo y WhatsApp en <Link href="/negocio" className="underline">Mi negocio</Link>, y tus eventos en{" "}
          <Link href="/eventos" className="underline">Proyectos</Link>. Si no estás conforme con nuestra respuesta, puedes acudir al Instituto Nacional de
          Transparencia, Acceso a la Información y Protección de Datos Personales (INAI).
        </p>
      </Seccion>

      <Seccion n="8" title="Seguridad">
        <p>
          La conexión siempre va cifrada (HTTPS); las contraseñas se guardan con hash; el acceso a la base de datos está restringido a la aplicación y a
          la administración de {RESPONSABLE.marca}; los enlaces de solo vista usan claves largas que no se adivinan. Ningún sistema es infalible: si
          detectáramos un incidente que afecte tus datos, te avisaríamos por el correo de tu cuenta.
        </p>
      </Seccion>

      <Seccion n="9" title="Menores de edad">
        <p>
          Plantea es para mayores de 18 años. Si un evento es de una persona menor (por ejemplo, unos XV años), la cuenta la crea y la administra un
          adulto responsable.
        </p>
      </Seccion>

      <Seccion n="10" title="Cambios a este aviso">
        <p>
          Si cambiamos algo relevante, lo publicaremos aquí con la nueva fecha y, si te afecta directamente, te lo diremos en la aplicación o por correo
          antes de que aplique.
        </p>
      </Seccion>
    </Legal>
  );
}
