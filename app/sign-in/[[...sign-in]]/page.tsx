import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <p className="mb-6 text-sm font-semibold">FileBridge</p>
      <SignIn />
    </div>
  );
}
