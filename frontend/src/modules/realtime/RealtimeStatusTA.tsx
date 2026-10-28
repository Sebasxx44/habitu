import { Radio, CloudOff } from "lucide-react";
import { TooltipTA } from "@/components/TA/TooltipTA";
import { useRealtimeStatus } from "@/modules/realtime/useRealtimeRefresh";

// COMPONENT
export const RealtimeStatusTA = () => {
  const { connected, status } = useRealtimeStatus();
  const message = connected
    ? "Cambios actualizados en tiempo real"
    : status === "offline"
      ? "Sin conexión. Los datos se actualizarán al reconectar."
      : status === "disabled" ? "Actualización periódica activa" : "Actualización periódica activa. Reconectando al tiempo real.";
  return (
    <TooltipTA content={message}>
      <span
        className={connected ? "text-emerald-500" : "text-muted-foreground"}
      >
        {connected ? <Radio size={16} /> : <CloudOff size={16} />}
      </span>
    </TooltipTA>
  );
};
