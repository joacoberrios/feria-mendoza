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

export type PlanType = "commission" | "fixed_fee";
export type PlanChannel = "web" | "instagram";

export type PublicationPlan = {
  id: number;
  name: string;
  type: PlanType;
  price: number | null;
  duration_days: number | null;
  max_active_listings: number | null;
  max_photos: number | null;
  commission_percentage: number | null;
  channel: PlanChannel;
  active: boolean;
};

export type OrderStatus =
  | "pending"
  | "paid"
  | "delivered"
  | "disputed"
  | "refunded"
  | "resolved";

export type Order = {
  id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  amount: number;
  commission_amount: number;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  status: OrderStatus;
  created_at: string;
};

// ============================================================ Bandeja social

export type SocialPlatform = "instagram" | "whatsapp";
export type SocialConversationKind = "dm" | "comment";
export type SocialConversationStatus = "pending" | "replied" | "archived" | "discarded";
export type SocialClassification =
  | "vendedor_potencial"
  | "comprador_interesado"
  | "consulta_general"
  | "ruido"
  | "spam"
  | "sin_clasificar";
export type SocialDirection = "in" | "out";
export type SocialMessageKind = "dm" | "comment" | "comment_reply" | "private_reply";
export type ReplyDraftStatus = "suggested" | "approved_sent" | "discarded" | "send_failed";

// WhatsApp (migración 0015)
export type WaFollowUpStatus =
  | "none"
  | "needs_follow_up"
  | "follow_up_suggested"
  | "follow_up_sent"
  | "dismissed";
export type WaMessageOrigin = "customer" | "api" | "phone_app";
export type WaDeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed";

export type SocialSettings = {
  id: 1;
  ig_access_token: string | null;
  ig_token_expires_at: string | null;
  updated_at: string;
};

export type SocialContact = {
  id: number;
  platform: SocialPlatform;
  external_id: string;
  username: string | null;
  display_name: string | null;
  interaction_count: number;
  first_seen_at: string;
  last_seen_at: string;
  wa_id: string | null;
  phone_display: string | null;
};

export type SocialConversation = {
  id: number;
  contact_id: number;
  platform: SocialPlatform;
  kind: SocialConversationKind;
  ig_media_id: string | null;
  ig_media_caption: string | null;
  status: SocialConversationStatus;
  classification: SocialClassification;
  classification_confidence: number | null;
  priority_score: number;
  last_inbound_at: string | null;
  created_at: string;
  customer_last_message_at: string | null;
  business_last_message_at: string | null;
  free_window_expires_at: string | null;
  follow_up_status: WaFollowUpStatus;
};

export type SocialMessage = {
  id: number;
  conversation_id: number;
  direction: SocialDirection;
  kind: SocialMessageKind;
  external_id: string;
  text: string | null;
  raw_payload: Record<string, unknown>;
  sent_by: string | null;
  created_at: string;
  wamid: string | null;
  origin: WaMessageOrigin;
  delivery_status: WaDeliveryStatus | null;
  delivery_error: string | null;
};

export type ReplyDraft = {
  id: number;
  conversation_id: number;
  in_reply_to: number | null;
  draft_text: string | null;
  status: ReplyDraftStatus;
  model: string | null;
  error_detail: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};
