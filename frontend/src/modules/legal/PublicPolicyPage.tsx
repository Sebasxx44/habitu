import type { ReactNode } from "react";
import { ActionHeaderTA } from "@/components/TA/ActionHeaderTA";
import { LinkButtonTA } from "@/components/TA/LinkButtonTA";
import { PanelTA } from "@/components/TA/PanelTA";
import { LegalLinksTA } from "@/modules/legal/LegalLinksTA";

// TYPES
interface PolicyPageProps {
  title: string;
  children: ReactNode;
}

// COMPONENTS
const PolicyPageTA = ({ title, children }: PolicyPageProps) => (
  <main className="min-h-svh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
    <div className="mx-auto max-w-3xl space-y-6">
      <ActionHeaderTA
        eyebrow="HABITÜ · Vista previa gratuita"
        title={title}
        description="Información actualizada el 28 de octubre de 2026."
        actions={
          <LinkButtonTA to="/login" variant="outline" size="sm">
            Ir a la app
          </LinkButtonTA>
        }
      />
      <div className="space-y-5 text-sm leading-7 text-muted-foreground [&_p+p]:mt-4">
        {children}
      </div>
      <footer className="space-y-2 border-t border-border pt-5">
        <p className="text-center text-sm leading-6 text-muted-foreground">
          Contacto:{" "}
          <a
            href="mailto:sanchezz3s47@gmail.com"
            className="break-all font-medium text-primary underline underline-offset-4"
          >
            sanchezz3s47@gmail.com
          </a>
        </p>
        <LegalLinksTA />
      </footer>
    </div>
  </main>
);

export const PrivacyPage = () => (
  <PolicyPageTA title="Privacidad">
    <PanelTA title="Cuenta y reservas">
      <div className="px-5 pb-5 sm:px-6">
        <p>
          HABITÜ permite descubrir proveedores y gestionar reservas. Utiliza tu
          nombre, correo, identificador de cuenta y datos de las reservas para
          prestar estas funciones. Las contraseñas se almacenan como hash en el
          servidor.
        </p>
        <p>
          Al entrar con Google recibimos identidad básica: nombre, correo e
          identificador de Google. No solicitamos acceso a Gmail ni Drive. La
          ubicación se utiliza cuando decides compartirla para buscar opciones
          cercanas.
        </p>
      </div>
    </PanelTA>
    <PanelTA title="Uso, almacenamiento y servicios externos">
      <div className="px-5 pb-5 sm:px-6">
        <p>
          Los proveedores acceden a los datos necesarios para gestionar sus
          reservas. El alojamiento utiliza Vercel y Render; Google verifica el
          acceso. Cuando Wompi esté habilitado, su checkout procesará los datos
          de pago. HABITÜ no almacena el número completo de tarjeta ni su código
          de seguridad.
        </p>
        <p>
          Las estadísticas opcionales de navegación requieren tu consentimiento.
          El navegador guarda el token de sesión y preferencias en localStorage.
          La caché sin conexión conserva recursos estáticos, no respuestas de la
          API ni datos privados de las reservas.
        </p>
      </div>
    </PanelTA>
    <PanelTA title="Tus solicitudes">
      <div className="px-5 pb-5 sm:px-6">
        <p>
          Puedes solicitar acceso, revisión, corrección o eliminación de tus
          datos al correo de contacto. Se revisa cada solicitud; pueden
          conservarse registros necesarios para gestionar operaciones o cumplir
          requisitos aplicables. Consulta los límites de conservación de esta
          vista previa en las condiciones de uso.
        </p>
      </div>
    </PanelTA>
  </PolicyPageTA>
);

export const TermsPage = () => (
  <PolicyPageTA title="Condiciones de uso">
    <PanelTA title="Vista previa gratuita">
      <div className="px-5 pb-5 sm:px-6">
        <p>
          HABITÜ está en vista previa, con disponibilidad limitada. El servidor
          puede pausarse por inactividad. La base de datos gratuita expira el 27
          de noviembre de 2026 y los archivos alojados son efímeros. No utilices
          esta vista previa para información sensible ni pagos reales mientras
          la pasarela esté deshabilitada.
        </p>
      </div>
    </PanelTA>
    <PanelTA title="Cuenta, reservas y pagos">
      <div className="px-5 pb-5 sm:px-6">
        <p>
          Utiliza información que puedas verificar, conserva el control de tu
          cuenta y no suplantes a terceros. Antes de confirmar, revisa
          proveedor, sede, fecha, precio y condiciones de cancelación o
          reprogramación mostradas. La prestación del servicio corresponde al
          proveedor. Una solicitud pendiente no equivale a una reserva
          confirmada.
        </p>
        <p>
          Wompi permanecerá deshabilitado hasta configurar el comercio. Cuando
          esté disponible, revisa el importe y la modalidad antes de pagar y
          consulta el estado verificado de la operación. Para incidencias de
          acceso o uso, escribe al correo de contacto.
        </p>
      </div>
    </PanelTA>
  </PolicyPageTA>
);
