export type UserRole = 'supervisor' | 'store' | 'staff';
export type UserStatus = 'duty' | 'leave' | 'sick' | 'absent' | 'pending_approval';
export type JobStatus = 'booked' | 'done' | 'approved';
export type LocoType = 'WAP-5' | 'WAP-7' | 'WAG-9';
export type TMStatus = 'healthy' | 'overhauled' | 'failed' | 'condemned' | 'external_repair' | 'in_loco';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  tokenNumber?: string;
  status: UserStatus;
  lastStatusUpdate: string;
}

export interface Locomotive {
  locoNumber: string;
  type: LocoType;
  commissionDate?: string;
  lastMaintenanceDate?: string;
  currentStatus: string;
}

export interface TractionMotor {
  tmId: string;
  type: LocoType;
  status: TMStatus;
  currentLocoId?: string;
  lastOverhaulDate?: string;
}

export interface Job {
  id: string;
  locoId: string;
  taskType: string;
  staffIds: string[];
  place: string;
  status: JobStatus;
  bookedBy: string;
  approvedBy?: string;
  timestamp: string;
}

export interface InventoryItem {
  partId: string;
  name: string;
  quantityNew: number;
  quantityHealthy: number;
  quantityScrap: number;
  minStockLevel: number;
}
