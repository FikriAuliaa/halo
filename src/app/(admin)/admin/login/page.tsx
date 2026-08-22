import { LoginForm } from "@/components/admin/login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.redirect;
  const redirectTo = typeof raw === "string" ? raw : "/admin";

  return <LoginForm redirectTo={redirectTo} />;
}
