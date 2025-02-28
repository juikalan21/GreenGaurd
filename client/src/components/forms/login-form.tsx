"use client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LoginForm() {
  return (
    <div className="p-4">
      <Button 
        onClick={() => toast.success("Starting GG", {
          description: "Green-Gaurd is starting",
            duration: 5000,
        })}
      >
        green-gaurd
      </Button>
    </div>
  );
}

export default LoginForm;
