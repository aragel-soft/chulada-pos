import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner"; 
import {
  getMachineId,
  checkLicenseOnline,
  updateLicenseValidation,
  checkOfflineLicense,
} from "@/lib/api/auth";

export const LicenseGuard = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "authorized" | "rejected">(
    "loading",
  );
  const [machineId, setMachineId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const verifyLicense = async () => {
      try {
        const id = await getMachineId();
        setMachineId(id);

        const license = await checkLicenseOnline(id);

        if (!license.is_active) {
          setStatus("rejected");
          setErrorMessage("Equipo No Autorizado");
          return;
        }

        await updateLicenseValidation();
        setStatus("authorized");

      } catch (err) {
        try {
          const offlineStatus = await checkOfflineLicense();
          
          if (offlineStatus.valid) {
            toast.warning(`Modo offline: Te quedan ${offlineStatus.days_left} días para operar sin conexión.`, {
              duration: 6000,
            });
            setStatus("authorized");
          } else {
            setStatus("rejected");
            setErrorMessage("Se requiere conexión a internet para validar la licencia");
          }
        } catch (offlineErr) {
          setStatus("rejected");
          setErrorMessage("Error crítico al leer configuración local");
        }
      }
    };

    verifyLicense();
  }, []);


  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-primary/20 flex items-center justify-center">
            <img src="/logo-icon.svg" alt="Cargando" className="h-10 w-10" />
          </div>
          <p className="text-muted-foreground animate-pulse">
            Verificando licencia...
          </p>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-destructive/10 p-6 text-center">
        <AlertCircle className="h-20 w-20 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-2">
          {errorMessage}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          Comunícate con soporte técnico y proporciona el siguiente
          identificador para registrar tu equipo, o verifica tu conexión a internet.
        </p>
        <div className="p-4 rounded-lg border-2 border-dashed border-destructive/50 select-all">
          <p className="font-mono text-lg font-semibold tracking-wider text-foreground">
            {machineId || "ID_NO_DISPONIBLE"}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
