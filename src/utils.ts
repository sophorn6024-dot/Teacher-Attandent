/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { Teacher, AttendanceRecord } from './types';

/**
 * Format timestamp to nice Khmer date
 */
export function formatKhmerDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const months = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];
    return `ថ្ងៃទី ${date.getDate()} ខែ ${months[date.getMonth()]} ឆ្នាំ ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Export teachers list to Excel
 */
export function exportTeachersToExcel(teachers: Teacher[]) {
  const mappedData = teachers.map((t, index) => ({
    'ល.រ (No.)': index + 1,
    'កូដគ្រូ (Teacher ID)': t.id,
    'ឈ្មោះគ្រូ (Teacher Name)': t.name,
    'ភេទ (Gender)': t.gender,
    'ថ្ងៃខែឆ្នាំកំណើត (DOB)': t.dob,
    'លេខទូរស័ព្ទ (Phone Number)': t.phone,
    'តំណភ្ជាប់រូបថត (Photo URL)': t.photoUrl || '',
    'កាលបរិច្ឆេទបង្កើត (Created At)': new Date(t.createdAt).toLocaleDateString(),
  }));

  const ws = XLSX.utils.json_to_sheet(mappedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'បញ្ជីឈ្មោះគ្រូបង្រៀន');

  // Adjust columns width
  const max_len = mappedData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
  ws['!cols'] = Array(max_len).fill({ wch: 22 });

  XLSX.writeFile(wb, 'បញ្ជីឈ្មោះគ្រូបង្រៀន_គ្រប់គ្រងវត្តមាន.xlsx');
}

/**
 * Generate Excel Template for Teachers import
 */
export function downloadTeachersTemplate() {
  const templateData = [
    {
      'ឈ្មោះគ្រូ (Teacher Name) *': 'សោម​ សុភ័ក្រ',
      'ភេទ (Gender) *': 'ប្រុស',
      'ថ្ងៃខែឆ្នាំកំណើត (DOB) *': '1990-05-24',
      'លេខទូរស័ព្ទ (Phone Number) *': '012999888',
      'តំណភ្ជាប់រូបថត (Photo URL)': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
    },
    {
      'ឈ្មោះគ្រូ (Teacher Name) *': 'លី ស្រីនីន',
      'ភេទ (Gender) *': 'ស្រី',
      'ថ្ងៃខែឆ្នាំកំណើត (DOB) *': '1995-12-10',
      'លេខទូរស័ព្ទ (Phone Number) *': '098112233',
      'តំណភ្ជាប់រូបថត (Photo URL)': '',
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'គំរូបញ្ចូលទិន្នន័យ');

  ws['!cols'] = [
    { wch: 28 }, // Name
    { wch: 15 }, // Gender
    { wch: 22 }, // DOB
    { wch: 22 }, // Phone
    { wch: 35 }, // Photo
  ];

  XLSX.writeFile(wb, 'គំរូបញ្ចូលទិន្នន័យគ្រូបង្រៀន.xlsx');
}

/**
 * Parse imported Excel file of teachers
 */
export function parseTeachersExcel(file: File): Promise<Omit<Teacher, 'id' | 'createdAt'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const parsedTeachers: Omit<Teacher, 'id' | 'createdAt'>[] = [];

        for (const row of jsonData) {
          // Robust checking for keys
          const keys = Object.keys(row);
          
          const nameKey = keys.find(k => k.includes('ឈ្មោះ') || k.toLowerCase().includes('name'));
          const genderKey = keys.find(k => k.includes('ភេទ') || k.toLowerCase().includes('gender'));
          const dobKey = keys.find(k => k.includes('ថ្ងៃខែឆ្នាំកំណើត') || k.toLowerCase().includes('dob') || k.toLowerCase().includes('birth'));
          const phoneKey = keys.find(k => k.includes('លេខទូរស័ព្ទ') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('tel'));
          const photoKey = keys.find(k => k.includes('រូបថត') || k.toLowerCase().includes('photo') || k.toLowerCase().includes('pic') || k.toLowerCase().includes('url'));

          if (!nameKey) continue; // Skip rows without name

          const rawName = String(row[nameKey] || '').trim();
          if (!rawName) continue;

          let rawGender = String(row[genderKey!] || 'ប្រុស').trim();
          let gender: 'ប្រុស' | 'ស្រី' | 'ផ្សេងៗ' = 'ប្រុស';
          if (rawGender.includes('ស្រី') || rawGender.toLowerCase() === 'female' || rawGender.toLowerCase() === 'f') {
            gender = 'ស្រី';
          } else if (rawGender.includes('ផ្សេង') || rawGender.toLowerCase() === 'other') {
            gender = 'ផ្សេងៗ';
          }

          // Format or parse DOB
          let valDob = String(row[dobKey!] || '');
          let dob = '1990-01-01';
          if (valDob) {
            // Check if it's an Excel serial date number
            const numDob = Number(valDob);
            if (!isNaN(numDob) && numDob > 10000) {
              try {
                // xlsx date conversion helper
                const dateObj = XLSX.SSF.parse_date_code(numDob);
                const mm = String(dateObj.m).padStart(2, '0');
                const dd = String(dateObj.d).padStart(2, '0');
                dob = `${dateObj.y}-${mm}-${dd}`;
              } catch (_) {
                dob = valDob;
              }
            } else {
              // Standard date text cleanup
              dob = valDob.split('T')[0];
            }
          }

          const phone = String(row[phoneKey!] || '').trim();
          const photoUrl = photoKey ? String(row[photoKey] || '').trim() : '';

          parsedTeachers.push({
            name: rawName,
            gender,
            dob,
            phone,
            photoUrl: photoUrl || undefined,
          });
        }

        resolve(parsedTeachers);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export attendance records to Excel
 */
export function exportAttendanceToExcel(records: AttendanceRecord[], selectedDate: string, className?: string) {
  const mappedData = records.map((r, index) => ({
    'ល.រ (No.)': index + 1,
    'កាលបរិច្ឆេទ (Date)': r.date,
    'កូដគ្រូ (Teacher ID)': r.teacherId,
    'ឈ្មោះគ្រូ (Teacher Name)': r.teacherName,
    'ថ្នាក់រៀន (Class Name)': r.className,
    'មុខវិជ្ជា (Subject)': r.subject,
    'ម៉ោងបង្រៀន (Time Slot)': r.timeSlot,
    'ស្ថានភាព (Status)': r.status,
    'ម៉ោងស្កេន (Scanned Time)': r.scannedAt ? new Date(r.scannedAt).toLocaleTimeString('en-US', { hour12: false }) : 'បញ្ជូលដោយដៃ',
    'សម្គាល់/ព័ត៌មានបន្ថែម (Remarks)': r.remarks || '',
  }));

  const ws = XLSX.utils.json_to_sheet(mappedData);
  const wb = XLSX.utils.book_new();
  
  const title = className ? `វត្តមាន_ថ្នាក់_${className}` : 'របាយការណ៍វត្តមានរួម';
  XLSX.utils.book_append_sheet(wb, ws, 'វត្តមានគ្រូបង្រៀន');

  ws['!cols'] = [
    { wch: 10 }, // No
    { wch: 15 }, // Date
    { wch: 15 }, // ID
    { wch: 25 }, // Name
    { wch: 15 }, // Class
    { wch: 20 }, // Subject
    { wch: 22 }, // Time Slot
    { wch: 15 }, // Status
    { wch: 18 }, // Scan Time
    { wch: 30 }, // Remarks
  ];

  const fileSuffix = className ? `_${className}` : '';
  XLSX.writeFile(wb, `របាយការណ៍វត្តមានគ្រូ_${selectedDate}${fileSuffix}.xlsx`);
}
