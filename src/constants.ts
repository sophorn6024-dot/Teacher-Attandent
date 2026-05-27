/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher, Classroom, Subject, TimeSlot } from './types';

export const DEFAULT_CLASSES: Classroom[] = [
  { id: 'c1', name: 'ថ្នាក់ទី1A (Grade 1)' },
  { id: 'c2', name: 'ថ្នាក់ទី1B (Grade 1)' },
  { id: 'c3', name: 'ថ្នាក់ទី2A (Grade 2)' },
  { id: 'c4', name: 'ថ្នាក់ទី2B (Grade 2)' },
  { id: 'c5', name: 'ថ្នាក់ទី3A (Grade 3)' },
  { id: 'c6', name: 'ថ្នាក់ទី3B (Grade 3)' },
  { id: 'c7', name: 'ថ្នាក់ទី4A (Grade 4)' },
  { id: 'c8', name: 'ថ្នាក់ទី4B (Grade 4)' },
  { id: 'c9', name: 'ថ្នាក់ទី5A (Grade 5)' },
  { id: 'c10', name: 'ថ្នាក់ទី5B (Grade 5)' },
  { id: 'c11', name: 'ថ្នាក់ទី6A (Grade 6)' },
  { id: 'c12', name: 'ថ្នាក់ទី6B (Grade 6)' },
];

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 's1', name: 'ភាសាខ្មែរ (Khmer)' },
  { id: 's2', name: 'គណិតវិទ្យា (Math)' },
  { id: 's3', name: 'វិទ្យាសាស្ត្រ (Science)' },
  { id: 's4', name: 'សិក្សាសង្គម (Social Studies)' },
  { id: 's5', name: 'ភាសាអង់គ្លេស (English)' },
  { id: 's6', name: 'សិល្បៈ និងកាយវិការ (Art & PE)' },
];

export const DEFAULT_TIMESLOTS: TimeSlot[] = [
  { id: 't1', label: 'វេនព្រឹក: 07:00 - 11:00 ព្រឹក' },
  { id: 't2', label: 'វេនល្ងាច: 01:00 - 05:00 ល្ងាច' },
];

export const DEFAULT_TEACHERS: Teacher[] = [
  {
    id: 'T-1001',
    name: 'សុខ ជា',
    gender: 'ប្រុស',
    dob: '1985-04-12',
    phone: '012345678',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'T-1002',
    name: 'ស្រីមុំ ចាន់ណា',
    gender: 'ស្រី',
    dob: '1990-11-23',
    phone: '098765432',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-01-12T08:00:00Z',
  },
  {
    id: 'T-1003',
    name: 'គឹម សេង',
    gender: 'ប្រុស',
    dob: '1979-08-30',
    phone: '088123456',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-02-01T08:00:00Z',
  },
  {
    id: 'T-1004',
    name: 'លីដា សុជាតា',
    gender: 'ស្រី',
    dob: '1992-05-15',
    phone: '015999888',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-02-15T08:00:00Z',
  },
  {
    id: 'T-1005',
    name: 'ភារុណ ដាវីត',
    gender: 'ប្រុស',
    dob: '1988-01-20',
    phone: '077223344',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    createdAt: '2026-03-01T08:00:00Z',
  }
];
