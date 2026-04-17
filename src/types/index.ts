/**
 * Core type definitions for the Khaja app
 */

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  address?: Address;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  photoURL?: string;
  isVerified: boolean;
  role: 'customer' | 'admin' | 'delivery' | 'kitchen';
}

/**
 * Address information
 */
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * User preferences
 */
export interface UserPreferences {
  language: 'en' | 'ne';
  notifications: boolean;
  darkMode: boolean;
  defaultDeliveryAddress?: Address;
}

/**
 * Order data model
 */
export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  tax: number;
  specialInstructions?: string;
  deliveryAddress: Address;
  estimatedDeliveryTime?: number; // minutes
  createdAt: Date;
  updatedAt: Date;
  paymentMethod: 'cash' | 'card' | 'wallet';
  paymentStatus: PaymentStatus;
  ratingSent?: boolean;
  ratingScore?: number;
  ratingComment?: string;
}

/**
 * Individual items in an order
 */
export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
  customizations?: OrderItemCustomization[];
}

/**
 * Order item customizations
 */
export interface OrderItemCustomization {
  category: string; // e.g., "Spice Level", "Size"
  value: string; // e.g., "Medium", "Less Oil"
}

/**
 * Order status enum
 */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed';

/**
 * Payment status enum
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

/**
 * Extended order details with restaurant info
 */
export interface OrderDetails extends Order {
  restaurant: RestaurantInfo;
  deliveryAgent?: DeliveryAgent;
  timeline?: OrderTimeline[];
}

/**
 * Restaurant information
 */
export interface RestaurantInfo {
  id: string;
  name: string;
  address: Address;
  cuisineType: string[];
  rating: number;
  reviewCount: number;
  photoURL?: string;
  minOrderAmount?: number;
  deliveryTime?: number; // average minutes
}

/**
 * Delivery agent information
 */
export interface DeliveryAgent {
  id: string;
  name: string;
  phoneNumber: string;
  photoURL?: string;
  rating: number;
  liveLocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Order timeline events
 */
export interface OrderTimeline {
  status: OrderStatus;
  timestamp: Date;
  message: string;
  actor?: 'system' | 'restaurant' | 'delivery' | 'user';
}

/**
 * Kitchen/Restaurant management data
 */
export interface Kitchen {
  id: string;
  name: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  address: Address;
  cuisineTypes: string[];
  operatingHours: OperatingHours;
  contactNumber: string;
  bankDetails?: BankDetails;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  ratings?: {
    average: number;
    count: number;
  };
}

/**
 * Operating hours for kitchen
 */
export interface OperatingHours {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday: TimeRange;
  sunday: TimeRange;
}

/**
 * Time range (HH:MM format)
 */
export interface TimeRange {
  open: string; // "09:00"
  close: string; // "22:00"
  closed?: boolean;
}

/**
 * Bank account details for payouts
 */
export interface BankDetails {
  accountHolder: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  eventName: string;
  userId?: string;
  properties?: Record<string, any>;
  timestamp: Date;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  nextCursor?: string;
}
