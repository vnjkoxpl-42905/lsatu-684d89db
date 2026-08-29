// One definition of "a paying student's access", used by the Stripe webhook and
// anything else that needs to open the product after a payment.
//
// A new account starts locked (see the profiles column defaults): they can see
// their classroom, finish the intake, message Joshua and book. Paying turns on
// the rest. Nothing here ever revokes — a refund is Joshua's call from People,
// not something a webhook should decide.

export const PAID_STUDENT_FLAGS = [
  "has_classroom_access",
  "has_practice_access",
  "has_drill_access",
  "has_bootcamp_access",
  "has_journal_access",
  "has_waj_access",
  "has_chat_access",
  "has_schedule_access",
  "has_activity_access",
] as const;

export type GrantResult =
  | { granted: true; class_id: string }
  | { granted: false; reason: "no_email" | "no_account" };

/** Opens the paid feature set for whoever owns `email`. */
export async function grantStudentAccess(
  admin: { auth: { admin: { listUsers: (opts: { perPage: number }) => Promise<any> } }; from: (t: string) => any },
  email: string | null | undefined,
): Promise<GrantResult> {
  if (!email) return { granted: false, reason: "no_email" };
  const target = email.trim().toLowerCase();

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = (data?.users ?? []).find(
    (u: { email?: string | null }) => (u.email ?? "").toLowerCase() === target,
  );
  // Someone can pay before they ever make an account. That is not an error:
  // Joshua grants them by hand once they sign up, and the payment record still
  // exists either way.
  if (!user) return { granted: false, reason: "no_account" };

  const updates: Record<string, boolean> = {};
  for (const flag of PAID_STUDENT_FLAGS) updates[flag] = true;

  const { error } = await admin.from("profiles").update(updates).eq("class_id", user.id);
  if (error) throw error;
  return { granted: true, class_id: user.id };
}
