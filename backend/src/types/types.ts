import { MasterSpecialty, OrderStatus } from '@prisma/client';

export type BaseUser =
  | {
      id?: string;
      email: string;
      phone?: string | null;
      name?: string | null;
      telegramId?: string | null;
      preferredChannel?: string;
    }
  | {
      id?: string;
      phone: string;
      email?: string | null;
      telegramId?: string | null;
      name?: string | null;
      preferredChannel?: string;
    }
  | {
      id?: string;
      email?: string | null;
      telegramId: string;
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
  | 'PHONE_CONFIRM'
  | 'EMAIL_CHANGE'
  | 'PHONE_CHANGE';

export type ContactChangeType = Extract<
  VerificationType,
  'EMAIL_CHANGE' | 'PHONE_CHANGE' | 'PASSWORD_CHANGE'
>;

export type OtherVerificationType = Exclude<
  VerificationType,
  ContactChangeType
>;

export type BaseOrder = {
  id?: string;
  customerId: string;
  masterId: string;
  description: string;
  postalCode: string;
  startAt?: string;
  endAt?: string;
  preferredChannel?: string;
  requestId?: string;
};

export type Session = {
  userId: string;
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

export type IdentityChannel = 'email' | 'phone';

export type Identity = {
  channel: IdentityChannel;
  value: string;
};

export type GetOrdersFilter = {
  userId: string;
  date?: string | Date;
  dateDirection?: 'newer' | 'older';
  status?: OrderStatus;
  masterId?: string;
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
  orderId?: string;
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
  id: string;
  userId: string;
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

export type ResolvedVerification =
  | {
      type: ContactChangeType;
      userId: string;
      channel?: Channel;
      value?: string;
      order?: BaseOrder;
      inputData?: string;
      requestId?: string;
    }
  | {
      type: OtherVerificationType;
      channel: Channel;
      value: string;
      order?: BaseOrder;
      inputData?: string;
      requestId?: string;
    };
