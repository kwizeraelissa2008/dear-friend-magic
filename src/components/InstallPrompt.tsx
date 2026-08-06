import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("sdms-install-dismissed") === "1",
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const close = () => {
    localStorage.setItem("sdms-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-xl md:left-auto md:right-4 md:w-80">
      <img
        src="/icon-192.png"
        alt=""
        width={40}
        height={40}
        loading="lazy"
        className="h-10 w-10 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Install SDMS</p>
        <p className="text-xs text-muted-foreground">
          Add to your home screen for app-like access.
        </p>
      </div>
      <Button size="sm" onClick={install} className="shrink-0 gap-1">
        <Download className="h-4 w-4" /> Install
      </Button>
      <button
        onClick={close}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default InstallPrompt;
