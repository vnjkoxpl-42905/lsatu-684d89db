import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleRcGradeRequest } from "./handler.ts";
serve(handleRcGradeRequest);
