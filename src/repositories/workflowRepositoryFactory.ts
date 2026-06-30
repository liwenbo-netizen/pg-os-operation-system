import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { LocalWorkflowRepository } from "./localWorkflowRepository";
import { SupabaseWorkflowRepository, type SupabaseLike } from "./supabaseWorkflowRepository";
import type { WorkflowRepository } from "./workflowRepository";

export function createWorkflowRepository(): WorkflowRepository {
  if (isSupabaseConfigured && supabase) {
    return new SupabaseWorkflowRepository(supabase as unknown as SupabaseLike);
  }

  return new LocalWorkflowRepository();
}
