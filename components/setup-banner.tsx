import { hasMicrosoftConfig, isAppConfigured } from "@/lib/config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SetupBanner() {
  const configured = isAppConfigured();
  const microsoft = hasMicrosoftConfig();
  if (configured && microsoft) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4">
      <Alert>
        <AlertTitle>Einrichtung unvollständig</AlertTitle>
        <AlertDescription>
          {!configured
            ? "Setze Clerk, DATABASE_URL und FILEBRIDGE_KMS_KEY in .env.local. Danach npm run db:push."
            : "OneDrive braucht MICROSOFT_CLIENT_ID und MICROSOFT_CLIENT_SECRET (Azure-App)."}
        </AlertDescription>
      </Alert>
    </div>
  );
}
