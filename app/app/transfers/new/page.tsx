import { TransferWizard } from "@/components/transfer-wizard";
import { FadeIn } from "@/components/fade-in";

export default function NewTransferPage() {
  return (
    <FadeIn className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Datei übertragen</h1>
        <p className="mt-1 text-muted-foreground">
          Drei Schritte: Quelle, Ziel, Start. Die Datei wird nicht umgewandelt.
        </p>
      </div>
      <TransferWizard />
    </FadeIn>
  );
}
