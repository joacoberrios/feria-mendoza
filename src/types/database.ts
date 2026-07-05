export type UserRole = "user" | "admin";

export type VerificationStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected";

export type Zone = {
  id: number;
  name: string;
  active: boolean;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  zone_id: number | null;
  role: UserRole;
  verification_status: VerificationStatus;
  dni_photo_url: string | null;
  created_at: string;
};
