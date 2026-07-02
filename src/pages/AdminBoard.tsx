import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminBoard() {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-full">
      <div className="fixed left-16 top-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/mainhub")}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/85 px-3 text-sm font-medium text-zinc-100 shadow-lg backdrop-blur hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          aria-label="Return to main hub"
        >
          <ArrowLeft className="h-4 w-4" />
          <Home className="h-4 w-4" />
          <span>Main hub</span>
        </button>
      </div>
      <Excalidraw theme="dark" />
    </div>
  );
}
