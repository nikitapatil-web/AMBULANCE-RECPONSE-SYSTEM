export type UserRole = "patient" | "driver" | "hospital" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  hospitalId?: string;
  driverId?: string;
}

export interface Hospital {
  id: string;
  name: string;
  specializations: string[];
  x: number;
  y: number;
  phone: string;
  totalBeds: number;
  availableBeds: number;
}

export type AmbulanceType = "BLS" | "ALS" | "ICU" | "Patient Transport";
export type AmbulanceStatus = "available" | "on-trip" | "maintenance";

export interface Ambulance {
  id: string;
  plateNumber: string;
  type: AmbulanceType;
  status: AmbulanceStatus;
  driverId: string;
  hospitalId: string;
  fuelLevel: number;
  lastService: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  available: boolean;
  x: number;
  y: number;
  rating: number;
  ambulanceId?: string;
}

export type BookingStatus = "pending" | "accepted" | "in-transit" | "arrived" | "completed" | "cancelled";
export type EmergencySeverity = "Critical" | "High" | "Moderate" | "Low";

export interface Booking {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  symptoms: string;
  severity: EmergencySeverity;
  pickupLocation: {
    name: string;
    x: number;
    y: number;
  };
  destinationHospitalId: string;
  selectedAmbulanceId: string;
  selectedDriverId: string;
  status: BookingStatus;
  bookingTime: string;
  estimatedArrivalMinutes: number;
  aiAnalysis?: {
    severity: EmergencySeverity;
    recommendedAmbulanceType: AmbulanceType;
    suggestedHospitalSpecialization: string;
    explanation: string;
    firstAidInstructions: string;
    etaReasoning: string;
    recommendedHospitalId?: string;
    recommendedHospitalName?: string;
    recommendedAmbulanceId?: string;
    recommendedDriverId?: string;
    recommendedDriverName?: string;
  };
  feedback?: {
    rating: number;
    comments: string;
    timestamp: string;
  };
  ambulanceX?: number;
  ambulanceY?: number;
}

export interface EmergencyContact {
  id: string;
  patientId: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface DashboardStats {
  activeBookings: number;
  criticalCases: number;
  availableDrivers: number;
  availableAmbulances: number;
  totalBookingsCount: number;
  hospitalsCount: number;
  ambulancesCount: number;
  driversCount: number;
}
