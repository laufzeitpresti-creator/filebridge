import { TransferWizard } from "@/components/transfer-wizard";

export default function NewTransferPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Datei übertragen</h1>
        <p className="mt-1 text-muted-foreground">
          Quelle und Ziel können OneDrive oder SFTP sein. Die Datei wird nicht umgewandelt.
        </p>
      </div>
      <TransferWizard />
    </div>
  );
}
