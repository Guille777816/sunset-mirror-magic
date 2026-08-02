export async function assertAdmin(
  supabase: {
    from: (table: "user_roles") => {
      select: (columns: "role") => {
        eq: (column: "user_id", value: string) => {
          eq: (column: "role", value: "admin") => {
            maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
    };
  },
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No autorizado");
}