export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed?: number; // km/h
  accuracy?: number; // meters
}

export interface DriveLog {
  id: string;
  userId: string;
  workSessionId?: string;
  deliveryCaseId?: string;
  startTime: Date;
  endTime: Date;
  totalDistanceMeters: number;
  durationSeconds: number;
  averageSpeedKmh?: number;
  maxSpeedKmh?: number;
  routePath: RoutePoint[];
  createdAt: Date;
}

export interface GpsTrackingState {
  isTracking: boolean;
  currentPosition?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  currentRoutePoints: RoutePoint[];
  trackingStartTime?: Date;
  totalDistance: number;
  currentSpeed?: number;
}

export type GpsAccuracyMode = 'high' | 'balanced' | 'low_power';

export interface GpsSettings {
  accuracyMode: GpsAccuracyMode;
  updateInterval: number; // milliseconds
  distanceFilter: number; // meters
} 