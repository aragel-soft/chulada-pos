import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabase";
import { AlertCircle } from "lucide-react";

export const LicenseGuard = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "authorized" | "rejected">(
    "loading",
  );
  const [machineId, setMachineId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const id = await invoke<string>("get_machine_id");
        setMachineId(id);

        const { data, error } = await supabase
          .from("licenses")
          .select("is_active")
          .eq("machine_id", id)
          .single();

        if (error || !data || !data.is_active) {
          setStatus("rejected");
          setErrorMessage("Equipo No Autorizado");
          return;
        }

        setStatus("authorized");
      } catch (err) {
        setStatus("rejected");
        setErrorMessage("Error de conexión o validación de licencia");
      }
    };

    checkLicense();
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
          identificador para registrar tu equipo.
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
