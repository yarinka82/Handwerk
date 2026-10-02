import { MasterSpecialty, OrderStatus } from '@prisma/client';

export type BaseUser =
  | {
      id?: number;
      email: string;
      phone?: string | null;
      name?: string | null;
      telegramId?: string | null;
      preferredChannel?: string;
    }
  | {
      id?: number;
      phone: string;
      email?: string | null;
      telegramId?: string | null;
      name?: string | null;
      preferredChannel?: string;
    }
  | {
      id?: number;
      email: string | null;
      telegramId?: string;
      phone?: string | null;
      name?: string | null;
      preferredChannel?: string;
    };

export type MasterFilterPayload = {
  speciality?: MasterSpecialty;
  postalCode?: string;
  radiusKm?: number;
  searchQuery?: string;
  minPrice: number;
  maxPrice: number;
  page?: number;
  limit?: number;
};

export type VerificationType =
  | 'REGISTER'
  | 'LOGIN'
  | 'REQUEST_CONFIRM'
  | 'ORDER_CONFIRM'
  | 'EMAIL_CONFIRM'
  | 'PASSWORD_RESET'
  | 'PASSWORD_CHANGE'
  | 'PHONE_CONFIRM';

export type BaseOrder = {
  id?: number;
  masterId: number;
  description: string;
  postalCode: string;
  startAt?: string;
  endAt?: string;
  preferredChannel?: string;
  requestId?: string;
};

export type Session = {
  userId: number;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  accessTokenValidUntil: Date;
};

export type UserAuthInput =
  | { email: string; phone?: never; telegram?: never; googleId?: never }
  | { phone: string; email?: never; telegram?: never; googleId?: never }
  | { telegram: string; email?: never; phone?: never; googleId?: never }
  | { googleId: string; email?: never; phone?: never; telegram?: never };

export type Channel = 'email' | 'phone' | 'telegramId' | 'googleId';

export type GetOrdersFilter = {
  userId: number;
  date?: string | Date;
  dateDirection?: 'newer' | 'older';
  status?: OrderStatus;
  masterId?: number;
  postalCode?: string;
  cancelledReason?: string;
  cancelledById?: string;
  dataCancelled?: string;
  customerCompleteddAt?: string;
  masterCompleteddAt?: string;
};

export type InfoEventType =
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_TIME_PROPOSED'
  | 'ORDER_CANCELED'
  | 'ORDER_COMPLETED';

export type InfoMessage = {
  type: 'INFO';
  event: InfoEventType;
  orderId?: number;
};

export type MessageType = VerificationType | InfoMessage;

export type MasterSearchFilters = {
  category: MasterSpecialty;
  postalCode?: string;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  startAt?: string;
  endAt?: string;
  sortBy?: 'rating' | 'price' | 'distance';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type MasterSearchRow = {
  id: number;
  userId: number;
  speciality: MasterSpecialty;
  rating: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  name: string | null;
  distance_km: number | null;
};

export type RecurrencePayload = {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval?: number;
  daysOfWeek?: ('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU')[];
  byMonthDay?: number;
  bySetPos?: number;
  until?: string;
  count?: number;
  dtstart?: number;
};

export type DayKey = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
