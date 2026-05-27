/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Teacher, AttendanceRecord } from './types';

// Searches for a spreadsheet in Drive or creates it if not found
export async function searchOrCreateSpreadsheet(accessToken: string): Promise<string> {
  const SPREADSHEET_NAME = 'Teacher Attendance & Management System';
  const query = `name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  try {
    const searchRes = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      throw new Error(`Failed to search Drive: ${errorText}`);
    }

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      // Found the file
      return searchData.files[0].id;
    }

    // Not found, let's create a new spreadsheet
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        properties: {
          title: SPREADSHEET_NAME,
        },
        sheets: [
          {
            properties: {
              title: 'Teachers',
            },
          },
          {
            properties: {
              title: 'Attendance',
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Failed to create spreadsheet: ${errorText}`);
    }

    const createData = await createRes.json();
    const spreadsheetId = createData.spreadsheetId;

    // Initialize headers
    await initializeHeaders(accessToken, spreadsheetId);

    return spreadsheetId;
  } catch (error) {
    console.error('Error in searchOrCreateSpreadsheet:', error);
    throw error;
  }
}

// Injects the default headers into the newly created spreadsheet
async function initializeHeaders(accessToken: string, spreadsheetId: string): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const body = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: 'Teachers!A1:G1',
        values: [
          ['ID', 'Name', 'Gender', 'DOB', 'Phone', 'Photo URL', 'Created At'],
        ],
      },
      {
        range: 'Attendance!A1:J1',
        values: [
          [
            'ID',
            'Date',
            'Teacher ID',
            'Teacher Name',
            'Class Name',
            'Subject',
            'Time Slot',
            'Status',
            'Remarks',
            'Scanned At',
          ],
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to initialize spreadsheet headers: ${text}`);
  }
}

// Fetches both Teachers and Attendance records in a single batch GET
export async function fetchDataFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ teachers: Teacher[]; attendanceRecords: AttendanceRecord[] }> {
  const ranges = ['Teachers!A2:G1000', 'Attendance!A2:J10000'];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${ranges[0]}&ranges=${ranges[1]}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch spreadsheet data: ${text}`);
    }

    const data = await res.json();
    const valueRanges = data.valueRanges || [];

    const teachersRaw = valueRanges[0]?.values || [];
    const attendanceRaw = valueRanges[1]?.values || [];

    const teachers: Teacher[] = teachersRaw.map((row: any[]) => ({
      id: row[0] || '',
      name: row[1] || '',
      gender: (row[2] || 'ប្រុស') as 'ប្រុស' | 'ស្រី' | 'ផ្សេងៗ',
      dob: row[3] || '',
      phone: row[4] || '',
      photoUrl: row[5] || undefined,
      createdAt: row[6] || new Date().toISOString(),
    })).filter((t: Teacher) => t.id); // Filter out empty lines

    const attendanceRecords: AttendanceRecord[] = attendanceRaw.map((row: any[]) => ({
      id: row[0] || '',
      date: row[1] || '',
      teacherId: row[2] || '',
      teacherName: row[3] || '',
      className: row[4] || '',
      subject: row[5] || '',
      timeSlot: row[6] || '',
      status: (row[7] || 'វត្តមាន') as 'វត្តមាន' | 'អវត្តមាន' | 'ច្បាប់',
      remarks: row[8] || '',
      scannedAt: row[9] || undefined,
    })).filter((ar: AttendanceRecord) => ar.id);

    return { teachers, attendanceRecords };
  } catch (error) {
    console.error('Error in fetchDataFromSpreadsheet:', error);
    throw error;
  }
}

// Updates/saves the entire list of teachers to the spreadsheet
export async function saveTeachersToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  teachers: Teacher[]
): Promise<void> {
  try {
    // 1. Clear any old data
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Teachers!A2:G1000:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (teachers.length === 0) return;

    // 2. Prepare raw values
    const values = teachers.map((t) => [
      t.id,
      t.name,
      t.gender,
      t.dob,
      t.phone,
      t.photoUrl || '',
      t.createdAt,
    ]);

    // 3. Write new data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Teachers!A2:G${teachers.length + 1}?valueInputOption=USER_ENTERED`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ values }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`Failed to update Teachers sheet: ${text}`);
    }
  } catch (error) {
    console.error('Error in saveTeachersToSpreadsheet:', error);
    throw error;
  }
}

// Updates/saves the entire list of attendance records to the spreadsheet
export async function saveAttendanceToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  records: AttendanceRecord[]
): Promise<void> {
  try {
    // 1. Clear any old data
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Attendance!A2:J10000:clear`;
    await fetch(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (records.length === 0) return;

    // 2. Prepare raw values
    const values = records.map((r) => [
      r.id,
      r.date,
      r.teacherId,
      r.teacherName,
      r.className,
      r.subject,
      r.timeSlot,
      r.status,
      r.remarks || '',
      r.scannedAt || '',
    ]);

    // 3. Write new data
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Attendance!A2:J${records.length + 1}?valueInputOption=USER_ENTERED`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ values }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`Failed to update Attendance sheet: ${text}`);
    }
  } catch (error) {
    console.error('Error in saveAttendanceToSpreadsheet:', error);
    throw error;
  }
}
