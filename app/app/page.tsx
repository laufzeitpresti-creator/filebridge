import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AppHomePage() {
  const user = await currentUser();
  const name = user?.firstName || "dort";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hallo {name}</h1>
        <p className="mt-1 text-muted-foreground">
          Verbinde Cloud, Server oder dieses Gerät – dann eine Datei rüberschieben, auch als Link aufs iPhone.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Verbindungen</CardTitle>
            <CardDescription>Clouds, SFTP, WebDAV, S3, Gerät, iPhone-Link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/connections">Verbindungen öffnen</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Datei übertragen</CardTitle>
            <CardDescription>Quelle wählen, Zielordner wählen, starten.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/transfers/new">Datei übertragen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
