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

export type Category = {
  id: number;
  name: string;
  active: boolean;
};

export type ProductCondition = "nuevo" | "como_nuevo" | "usado";

export type ProductStatus =
  | "draft"
  | "pending_payment"
  | "active"
  | "paused"
  | "sold"
  | "removed";

export type Product = {
  id: number;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category_id: number;
  zone_id: number;
  condition: ProductCondition;
  status: ProductStatus;
  plan_id: number | null;
  created_at: string;
};

export type ProductPhoto = {
  id: number;
  product_id: number;
  storage_path: string;
  is_primary: boolean;
  position: number;
  created_at: string;
};
