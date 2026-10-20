import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <Button type="submit" size="pill" disabled={pending} className="w-full">
      {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}
