export function canCorrectItineraryConfirmationDateRole(role: string): boolean {
  return ["admin", "super_admin", "superadmin"].includes(
    role.trim().toLowerCase(),
  );
}
