import { useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, Cloud, Database, Radio, Wifi } from "lucide-react";

type StatusState = "online" | "offline" | "checking";
type ServiceStatus = {
  status: StatusState;
  message?: string;
};
type StatusResponse = {
  services?: {
    api?: ServiceStatus;
    auth?: ServiceStatus;
    delivery?: ServiceStatus;
    ai?: ServiceStatus;
  };
};

type ServiceStatusStripProps = {
  aiStatus?: StatusState;
  className?: string;
  showAi?: boolean;
};

const statusStyles: Record<StatusState, string> = {
  online: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  offline: "border-red-400/25 bg-red-400/10 text-red-300",
  checking: "border-amber-400/25 bg-amber-400/10 text-amber-300",
};

const dotStyles: Record<StatusState, string> = {
  online: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.8)]",
  offline: "bg-red-300",
  checking: "bg-amber-300 animate-pulse",
};

function toStatus(value: string | undefined): StatusState {
  return value === "online" || value === "offline" ? value : "checking";
}

function StatusBadge({
  icon: Icon,
  label,
  status,
  message,
}: {
  icon: typeof Activity;
  label: string;
  status: StatusState;
  message: string;
}) {
  return (
    <div
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-medium ${statusStyles[status]}`}
      title={message}
      aria-label={`${label}: ${status}. ${message}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotStyles[status]}`} />
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="capitalize text-current/80">{status}</span>
    </div>
  );
}

export function ServiceStatusStrip({
  aiStatus,
  className = "",
  showAi = true,
}: ServiceStatusStripProps) {
  const [browserStatus, setBrowserStatus] = useState<StatusState>("checking");
  const [apiStatus, setApiStatus] = useState<StatusState>("checking");
  const [apiMessage, setApiMessage] = useState("Checking KingDavez Studios API routes.");
  const [authStatus, setAuthStatus] = useState<StatusState>("checking");
  const [authMessage, setAuthMessage] = useState("Checking login and signup.");
  const [deliveryStatus, setDeliveryStatus] = useState<StatusState>("checking");
  const [deliveryMessage, setDeliveryMessage] = useState("Checking delivery routes.");
  const [serverAiStatus, setServerAiStatus] = useState<StatusState>("checking");
  const [serverAiMessage, setServerAiMessage] = useState("Checking AI prompt enhancer.");

  useEffect(() => {
    const updateBrowserStatus = () => {
      setBrowserStatus(navigator.onLine ? "online" : "offline");
    };

    updateBrowserStatus();
    window.addEventListener("online", updateBrowserStatus);
    window.addEventListener("offline", updateBrowserStatus);

    return () => {
      window.removeEventListener("online", updateBrowserStatus);
      window.removeEventListener("offline", updateBrowserStatus);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/status", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Status API returned ${response.status}`);
        return (await response.json()) as StatusResponse;
      })
      .then((data) => {
        if (cancelled) return;
        const api = data.services?.api;
        const auth = data.services?.auth;
        const delivery = data.services?.delivery;
        const ai = data.services?.ai;

        setApiStatus(toStatus(api?.status));
        setApiMessage(api?.message ?? "KingDavez Studios API routes are responding.");
        setAuthStatus(toStatus(auth?.status));
        setAuthMessage(auth?.message ?? "Login and signup status checked.");
        setDeliveryStatus(toStatus(delivery?.status));
        setDeliveryMessage(delivery?.message ?? "Delivery routes checked.");
        setServerAiStatus(toStatus(ai?.status));
        setServerAiMessage(ai?.message ?? "AI prompt enhancer status checked.");
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Status API could not be reached.";
        setApiStatus("offline");
        setApiMessage(message);
        setAuthStatus("offline");
        setAuthMessage("Login and signup status could not be checked.");
        setDeliveryStatus("offline");
        setDeliveryMessage("Delivery routes could not be checked.");
        setServerAiStatus("offline");
        setServerAiMessage("AI prompt enhancer status could not be checked.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const aiState = aiStatus ?? serverAiStatus;
  const items = useMemo(
    () => [
      {
        icon: Wifi,
        label: "Browser",
        status: browserStatus,
        message:
          browserStatus === "online"
            ? "Your browser reports an active network connection."
            : "Your browser reports that it is offline.",
      },
      {
        icon: Cloud,
        label: "Site API",
        status: apiStatus,
        message: apiMessage,
      },
      {
        icon: Database,
        label: "Auth",
        status: authStatus,
        message: authMessage,
      },
      {
        icon: Radio,
        label: "Delivery",
        status: deliveryStatus,
        message: deliveryMessage,
      },
      ...(showAi
        ? [
            {
              icon: BrainCircuit,
              label: "AI",
              status: aiState,
              message: aiStatus ? "AI prompt enhancer browser check." : serverAiMessage,
            },
          ]
        : []),
    ],
    [
      aiState,
      apiMessage,
      apiStatus,
      authMessage,
      authStatus,
      browserStatus,
      deliveryMessage,
      deliveryStatus,
      serverAiMessage,
      serverAiStatus,
      showAi,
    ],
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label="Service status">
      {items.map((item) => (
        <StatusBadge key={item.label} {...item} />
      ))}
    </div>
  );
}
