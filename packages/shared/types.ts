/**
 * Shared types between API, Mobile, and Admin
 * Public-facing DTOs (без internal-полей вроде raw_amocrm).
 */

export type Airport = "SVO" | "DME" | "VKO";
export type LoyaltyTier = "bronze" | "silver" | "gold";
export type BookingStatus = "new" | "confirmed" | "active" | "completed" | "cancelled";
export type BookingSource = "app" | "website" | "phone" | "amocrm";

export interface UserProfile {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  referralCode: string | null;
  createdAt: string;
}

export interface BookingDTO {
  id: string;
  airport: Airport;
  dateFrom: string;
  dateTo: string;
  priceRub: number;
  status: BookingStatus;
  carNumber: string | null;
  carModel: string | null;
  loyaltyPointsEarned: number;
  loyaltyPointsUsed: number;
  source: BookingSource;
  createdAt: string;
}

export interface CalculatorRequest {
  airport: Airport;
  dateFrom: string;       // ISO 8601
  dateTo: string;
  promoCode?: string;
  useLoyaltyPoints?: number;
}

export interface CalculatorResponse {
  days: number;
  pricePerDayRub: number;
  totalRub: number;
  discountRub: number;
  loyaltyDiscountRub: number;
  finalRub: number;
  pointsToEarn: number;
}

export interface CreateBookingRequest extends CalculatorRequest {
  carNumber: string;
  carModel?: string;
  notes?: string;
  email?: string; // для отправки подтверждения брони на почту клиента
}

/* --- Auth --- */
export interface RequestOtpBody { phone: string; }
export interface VerifyOtpBody { phone: string; code: string; }
export interface AuthTokens { accessToken: string; refreshToken: string; expiresIn: number; }

/* --- Events (analytics) --- */
export interface EventPayload {
  eventName: string;
  sessionId?: string;
  source: "web" | "ios" | "android";
  url?: string;
  properties?: Record<string, unknown>;
  deviceInfo?: Record<string, unknown>;
}

/* --- amoCRM webhook (упрощённое) --- */
export interface AmoCrmLeadWebhook {
  leads?: { add?: AmoCrmLead[]; update?: AmoCrmLead[]; status?: AmoCrmLead[]; };
  contacts?: { add?: AmoCrmContact[]; update?: AmoCrmContact[]; };
}

export interface AmoCrmLead {
  id: number;
  status_id: number;
  pipeline_id: number;
  responsible_user_id: number;
  price?: number;
  custom_fields_values?: AmoCrmCustomField[];
  contacts?: { id: number }[];
  created_at: number;
  updated_at: number;
}

export interface AmoCrmContact {
  id: number;
  name?: string;
  custom_fields_values?: AmoCrmCustomField[];
  created_at: number;
  updated_at: number;
}

export interface AmoCrmCustomField {
  field_id: number;
  field_name?: string;
  field_code?: string;
  values: { value: string | number | boolean }[];
}
