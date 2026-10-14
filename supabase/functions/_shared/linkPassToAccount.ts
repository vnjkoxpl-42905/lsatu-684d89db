// Shared helper: resolve a student email to an auth account id, and attach
// account-less booking passes to that account.
//
// Booking passes created from the Teacher Desk by name/email only carry
// student_id = NULL. That still works for the public /book/<slug> link, but the
// signed-in surfaces (in-app Booking page, booking uploads, schedule history)
// look passes up by account id and find nothing. These helpers close that gap.

export async function findAuthUserIdByEmail(supabase: any, email: string | null | undefined): Promise<string | null> {
  const wanted = (email ?? "").trim().toLowerCase();
  if (!wanted) return null;
  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("findAuthUserIdByEmail failed", error.message ?? error);
      return null;
    }
    const users = data?.users ?? [];
    const hit = users.find((u: any) => (u.email ?? "").trim().toLowerCase() === wanted);
    if (hit) return hit.id as string;
    if (users.length < 200) break;
    page++;
  }
  return null;
}

// Permanently attach a pass to the account matching its email. Returns the
// linked account id (or null when there is no matching account).
export async function linkPassToAccount(supabase: any, pass: { id: string; student_id: string | null; student_email: string | null }): Promise<string | null> {
  if (pass.student_id) return pass.student_id;
  const userId = await findAuthUserIdByEmail(supabase, pass.student_email);
  if (!userId) return null;
  const { error } = await supabase.from("booking_passes").update({ student_id: userId }).eq("id", pass.id).is("student_id", null);
  if (error) {
    console.error("linkPassToAccount update failed", { passId: pass.id, error: error.message ?? error });
    return null;
  }
  return userId;
}
