/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string; // T-1001, etc.
  name: string;
  gender: 'ប្រុស' | 'ស្រី' | 'ផ្សេងៗ';
  dob: string; // YYYY-MM-DD
  phone: string;
  photoUrl?: string; // Base64 or placeholder URL
  createdAt: string;
}

export type AttendanceStatus = 'វត្តមាន' | 'អវត្តមាន' | 'ច្បាប់';

export interface AttendanceRecord {
  id: string; // AR-1001, etc.
  date: string; // YYYY-MM-DD
  teacherId: string;
  teacherName: string;
  className: string; // e.g., ថ្នាក់ទី10A
  subject: string; // e.g., គណិតវិទ្យា
  timeSlot: string; // e.g., 07:00 - 09:00
  status: AttendanceStatus;
  remarks: string;
  scannedAt?: string; // Time of scan if scanned
}

export interface Classroom {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface TimeSlot {
  id: string;
  label: string;
}
