import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function LockedModule() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
          <Lock className="w-7 h-7 text-zinc-400" />
        </div>
        <h1 className="text-white text-xl font-semibold tracking-tight mb-2">
          Premium Content Locked
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          You do not have access to this module. Please contact administration.
        </p>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          onClick={() => navigate("/foyer")}
        >
          Return to Foyer
        </Button>
      </div>
    </div>
  );
}
