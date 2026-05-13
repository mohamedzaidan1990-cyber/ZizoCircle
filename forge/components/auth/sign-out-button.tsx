import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action="/auth/sign-out" method="post">
      <Button variant="ghost" size="sm" type="submit">
        Sign out
      </Button>
    </form>
  );
}
