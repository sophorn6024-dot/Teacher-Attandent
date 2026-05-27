/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, ClipboardList, QrCode, CheckCircle, GraduationCap, 
  HelpCircle, Settings, LogOut, Code, Heart, Clock, Cloud, CloudOff, RefreshCw, LogIn, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher, AttendanceRecord } from './types';
import { DEFAULT_TEACHERS } from './constants';
import { DashboardStats } from './components/DashboardStats';
import { TeacherManagement } from './components/TeacherManagement';
import { AttendanceTracker } from './components/AttendanceTracker';
import { QRScanner } from './components/QRScanner';
import { initAuth, googleSignIn, logout } from './firebaseAuth';
import { 
  searchOrCreateSpreadsheet, 
  fetchDataFromSpreadsheet, 
  saveTeachersToSpreadsheet, 
  saveAttendanceToSpreadsheet 
} from './googleSheetsService';
import { User } from 'firebase/auth';

export default function App() {
  // 1. Core States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'teachers' | 'qrcode'>('dashboard');

  // Google Sheets integration state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 2. Load initially from LocalStorage or default
  useEffect(() => {
    const savedTeachers = localStorage.getItem('school_teachers');
    const savedRecords = localStorage.getItem('school_attendance');
    const savedSheetId = localStorage.getItem('school_spreadsheet_id');
    
    if (savedTeachers) {
      setTeachers(JSON.parse(savedTeachers));
    } else {
      setTeachers(DEFAULT_TEACHERS);
      localStorage.setItem('school_teachers', JSON.stringify(DEFAULT_TEACHERS));
    }

    if (savedRecords) {
      setAttendanceRecords(JSON.parse(savedRecords));
    } else {
      setAttendanceRecords([]);
    }

    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
    }

    // Set today's date formatted to local timezone YYYY-MM-DD
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - tzOffset)).toISOString().slice(0, 10);
    setSelectedDate(localISOTime);

    // Initialize Auth Listener & Auto-Sync
    const unsubscribe = initAuth(
      async (loggedInUser, token) => {
        setUser(loggedInUser);
        setAccessToken(token);
        
        try {
          setIsSyncing(true);
          setSyncError(null);
          const sheetId = savedSheetId || await searchOrCreateSpreadsheet(token);
          if (sheetId) {
            setSpreadsheetId(sheetId);
            localStorage.setItem('school_spreadsheet_id', sheetId);
            const sheetData = await fetchDataFromSpreadsheet(token, sheetId);
            
            if (sheetData.teachers.length > 0) {
              setTeachers(sheetData.teachers);
              localStorage.setItem('school_teachers', JSON.stringify(sheetData.teachers));
            }
            if (sheetData.attendanceRecords.length > 0) {
              setAttendanceRecords(sheetData.attendanceRecords);
              localStorage.setItem('school_attendance', JSON.stringify(sheetData.attendanceRecords));
            }
          }
        } catch (err: any) {
          console.error('Initial sheets fetching failed:', err);
          setSyncError('មិនអាចទាញទិន្នន័យស្វ័យប្រវត្តពី Google Sheets៖ ' + err.message);
        } finally {
          setIsSyncing(false);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  // Async helpers to push updates
  const syncTeachersToSheets = async (currTeachers: Teacher[], currentToken: string, currentSheetId: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await saveTeachersToSpreadsheet(currentToken, currentSheetId, currTeachers);
    } catch (error: any) {
      console.error('Error syncing teachers to sheets:', error);
      setSyncError('បរាជ័យក្នុងការរក្សាទុកទិន្នន័យគ្រូទៅ Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  const syncAttendanceToSheets = async (currRecords: AttendanceRecord[], currentToken: string, currentSheetId: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      await saveAttendanceToSpreadsheet(currentToken, currentSheetId, currRecords);
    } catch (error: any) {
      console.error('Error syncing attendance to sheets:', error);
      setSyncError('បរាជ័យក្នុងការរក្សាទុកវត្តមានទៅ Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. Keep Synced
  const saveTeachers = (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    localStorage.setItem('school_teachers', JSON.stringify(newTeachers));
    if (accessToken && spreadsheetId) {
      syncTeachersToSheets(newTeachers, accessToken, spreadsheetId);
    }
  };

  const saveAttendance = (newRecords: AttendanceRecord[]) => {
    setAttendanceRecords(newRecords);
    localStorage.setItem('school_attendance', JSON.stringify(newRecords));
    if (accessToken && spreadsheetId) {
      syncAttendanceToSheets(newRecords, accessToken, spreadsheetId);
    }
  };

  // Google Sheets Action Handlers
  const handleConnectSheets = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessToken(result.accessToken);
        setUser(result.user);
        
        const sheetId = await searchOrCreateSpreadsheet(result.accessToken);
        setSpreadsheetId(sheetId);
        localStorage.setItem('school_spreadsheet_id', sheetId);

        const sheetData = await fetchDataFromSpreadsheet(result.accessToken, sheetId);
        
        if (sheetData.teachers.length > 0 || sheetData.attendanceRecords.length > 0) {
          setTeachers(sheetData.teachers);
          setAttendanceRecords(sheetData.attendanceRecords);
          localStorage.setItem('school_teachers', JSON.stringify(sheetData.teachers));
          localStorage.setItem('school_attendance', JSON.stringify(sheetData.attendanceRecords));
        } else {
          if (teachers.length > 0) {
            await saveTeachersToSpreadsheet(result.accessToken, sheetId, teachers);
          }
          if (attendanceRecords.length > 0) {
            await saveAttendanceToSpreadsheet(result.accessToken, sheetId, attendanceRecords);
          }
        }
      }
    } catch (err: any) {
      console.error('Connecting Google Sheets failed:', err);
      setSyncError('បរាជ័យក្នុងការភ្ជាប់ទៅ Google Sheets៖ ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectSheets = async () => {
    setIsSyncing(true);
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      setSpreadsheetId(null);
      localStorage.removeItem('school_spreadsheet_id');
    } catch (err) {
      console.error('Failed to log out of Google:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const sheetData = await fetchDataFromSpreadsheet(accessToken, spreadsheetId);
      setTeachers(sheetData.teachers);
      setAttendanceRecords(sheetData.attendanceRecords);
      localStorage.setItem('school_teachers', JSON.stringify(sheetData.teachers));
      localStorage.setItem('school_attendance', JSON.stringify(sheetData.attendanceRecords));
    } catch (err: any) {
      console.error('Failed to manually pull from Google Sheets:', err);
      setSyncError('មិនអាចទាញទិន្នន័យពី Google Sheets បានទេ៖ ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Helper to generate next unique Teacher ID
  const generateNextTeacherID = (currentList: Teacher[]): string => {
    if (currentList.length === 0) return 'T-1001';
    
    const ids = currentList
      .map(t => {
        const parts = t.id.split('-');
        return parts.length > 1 ? parseInt(parts[1], 10) : null;
      })
      .filter((num): num is number => num !== null && !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 1000;
    return `T-${maxId + 1}`;
  };

  // 5. Teacher CRUD Actions
  const handleAddTeacher = (newTeacherData: Omit<Teacher, 'id' | 'createdAt'>) => {
    const nextId = generateNextTeacherID(teachers);
    const newTeacher: Teacher = {
      ...newTeacherData,
      id: nextId,
      createdAt: new Date().toISOString()
    };
    saveTeachers([...teachers, newTeacher]);
  };

  const handleUpdateTeacher = (updatedTeacher: Teacher) => {
    const updated = teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t);
    saveTeachers(updated);
  };

  const handleDeleteTeacher = (id: string) => {
    const filtered = teachers.filter(t => t.id !== id);
    saveTeachers(filtered);

    // Clean up attendance records for this deleted teacher as well
    const filteredAttendance = attendanceRecords.filter(r => r.teacherId !== id);
    saveAttendance(filteredAttendance);
  };

  const handleImportTeachers = (importedList: Omit<Teacher, 'id' | 'createdAt'>[]) => {
    let currentTeachers = [...teachers];
    
    const finalNewTeachers = importedList.map(item => {
      const nextId = generateNextTeacherID(currentTeachers);
      const newTeacher: Teacher = {
        ...item,
        id: nextId,
        createdAt: new Date().toISOString()
      };
      // Optimistically append to sequential counting logic
      currentTeachers.push(newTeacher);
      return newTeacher;
    });

    saveTeachers([...teachers, ...finalNewTeachers]);
  };

  // 6. Attendance Database operations
  const handleSaveAttendanceBatch = (batch: Omit<AttendanceRecord, 'id'>[]) => {
    if (batch.length === 0) return;

    const sample = batch[0];
    
    // Clean out any existing items for this context criteria
    let cleandList = attendanceRecords.filter(r => 
      !(r.date === sample.date && 
        r.className === sample.className && 
        r.subject === sample.subject && 
        r.timeSlot === sample.timeSlot)
    );

    // Insert the new list
    const finalBatch: AttendanceRecord[] = batch.map((item, idx) => ({
      ...item,
      id: `AR-${Date.now()}-${idx}`
    }));

    saveAttendance([...cleandList, ...finalBatch]);
  };

  const handleAddAttendanceSingle = (record: Omit<AttendanceRecord, 'id'>) => {
    // Clean out existing record for this date, classroom, subject, timeslot, and teacher
    let cleandList = attendanceRecords.filter(r => 
      !(r.date === record.date && 
        r.className === record.className && 
        r.subject === record.subject && 
        r.timeSlot === record.timeSlot &&
        r.teacherId === record.teacherId)
    );

    const fullRecord: AttendanceRecord = {
      ...record,
      id: `AR-QR-${Date.now()}`
    };

    saveAttendance([...cleandList, fullRecord]);
  };

  // Tabs layout configuration
  const tabConfig = [
    { id: 'dashboard', label: 'ផ្ទាំងព័ត៌មាន', desc: 'Dashboard Overview', icon: Calendar },
    { id: 'attendance', label: 'កត់វត្តមានប្រចាំថ្ងៃ', desc: 'Daily Attendance', icon: ClipboardList },
    { id: 'teachers', label: 'គ្រប់គ្រងទិន្នន័យគ្រូ', desc: 'Teacher Management', icon: Users },
    { id: 'qrcode', label: 'ស្កេនកូដ QR វត្តមាន', desc: 'QR Scanner System', icon: QrCode },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      
      {/* 1. Header Area with Khmer and English */}
      <header className="bg-white border-b border-slate-100 py-5 px-6 sticky top-0 z-30 shadow-sm shadow-slate-100/40 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Title Group */}
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-650/10">
              <GraduationCap className="w-6.5 h-6.5" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-md sm:text-lg font-bold text-slate-900 tracking-wide font-sans flex items-center gap-2">
                <span>ប្រព័ន្ធគ្រប់គ្រងទិន្នន័យ & របាយការណ៍វត្តមានគ្រូ</span>
                <span className="text-[10px] uppercase font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md border border-teal-100 font-bold">V1.0</span>
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-sans tracking-wide">
                Teacher Information Directory & Automatic QR Code Daily Attendance Tracker
              </p>
            </div>
          </div>

          {/* Google Sheets Sync Integration Panel */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-sans">
            {user ? (
              <div className="flex items-center gap-2 bg-teal-50/50 border border-teal-100 rounded-xl p-1.5 pr-3 shadow-sm shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-6.5 h-6.5 rounded-lg border border-teal-100" referrerpolicy="no-referrer" />
                ) : (
                  <div className="w-6.5 h-6.5 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold uppercase text-[10px]">
                    {user.email?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="font-bold text-teal-900 leading-tight">ភ្ជាប់ Google Sheet រួចរាល់</span>
                  <span className="text-[10px] text-teal-600 leading-none truncate max-w-[140px]" title={user.email || ''}>
                    {user.email}
                  </span>
                </div>
                
                {/* Spreadsheet External Link */}
                {spreadsheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-teal-100 text-teal-700 rounded-md transition-colors"
                    title="បើកមើល Google Sheets (Open Sheet)"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Refresh/Sync Manual Button */}
                <button
                  onClick={handleManualRefresh}
                  disabled={isSyncing}
                  className={`p-1 hover:bg-teal-100 text-teal-700 rounded-md transition-all ${isSyncing ? 'animate-spin' : ''}`}
                  title="ទាញយកទិន្នន័យថ្មីឡើងវិញ (Sync Data)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Log Out Connection */}
                <button
                  onClick={handleDisconnectSheets}
                  className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors border-l border-teal-100 pl-1.5 ml-1"
                  title="ផ្តាច់ការភ្ជាប់ Google Sheets (Disconnect)"
                >
                  <CloudOff className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectSheets}
                disabled={isSyncing}
                className="bg-white border hover:bg-slate-50 border-slate-200 text-slate-700 font-bold px-3.5 py-1.5 rounded-xl shrink-0 flex items-center gap-2 cursor-pointer shadow-sm active:scale-98 transition-all hover:border-teal-500 animate-pulse"
              >
                <Cloud className="w-4 h-4 text-teal-500" />
                <span className="font-sans text-xs text-teal-700">ភ្ជាប់ជាមួយ Google Sheets</span>
                {isSyncing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />}
              </button>
            )}
          </div>

        </div>

        {/* Error notification bar */}
        {syncError && (
          <div className="max-w-7xl mx-auto mt-3 px-4 py-2 bg-rose-50 border border-rose-150 rounded-xl text-rose-800 text-xs flex justify-between items-center font-sans">
            <span className="font-medium flex items-center gap-1.5">⚠️ {syncError}</span>
            <button onClick={() => setSyncError(null)} className="text-rose-400 hover:text-rose-600 font-bold px-1.5">
              បិទ
            </button>
          </div>
        )}
        {isSyncing && user && (
          <div className="max-w-7xl mx-auto mt-3 px-4 py-1.5 bg-teal-50/30 border border-teal-100 rounded-xl text-teal-800 text-[11px] flex items-center gap-2 font-sans animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
            <span>កំពុងធ្វើសមកាលកម្មទិន្នន័យជាមួយ Google Sheets... (Saving changes to cloud sheet)</span>
          </div>
        )}
      </header>

      {/* 2. Main Tab Navigation Controls */}
      <nav className="bg-white border-b border-slate-150 px-6 py-2 sticky top-[88px] z-25 no-print">
        <div className="max-w-7xl mx-auto flex overflow-x-auto gap-1 md:gap-2 pb-1.5 md:pb-0 scrollbar-none pr-1">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm transition-all focus:outline-none shrink-0 font-sans font-bold cursor-pointer ${
                  isActive 
                    ? 'text-teal-700' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {/* Visual Glow behind active tab */}
                {isActive && (
                  <motion.div 
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 bg-teal-50 rounded-2xl z-0"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                
                <Icon className={`w-4.5 h-4.5 z-10 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                <div className="text-left z-10 flex flex-col">
                  <span>{tab.label}</span>
                  <span className="text-[9px] font-normal text-slate-400 line-clamp-1">{tab.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Render Views container */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                {/* Stats Dashboard */}
                <DashboardStats 
                  teachers={teachers}
                  attendanceRecords={attendanceRecords}
                  selectedDate={selectedDate}
                />
                
                {/* Daily Overview Log Summary of Today */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="border-b border-slate-50 pb-3">
                    <h3 className="text-md font-bold text-slate-900 font-sans">
                      ប្រវត្តិវត្តមានដែលបានកត់ត្រាទុកក្នុងថ្ងៃនេះ ({selectedDate})
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      Recorded staff rosters & history summaries compiled for selected timestamp
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] font-sans font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-4 font-normal">កូដគ្រូ</th>
                          <th className="py-2.5 px-4 font-normal">ឈ្មោះគ្រូ</th>
                          <th className="py-2.5 px-4 font-normal">ថ្នាក់រៀន</th>
                          <th className="py-2.5 px-4 font-normal">មុខវិជ្ជា</th>
                          <th className="py-2.5 px-4 font-normal font-sans">ម៉ោងបង្រៀន</th>
                          <th className="py-2.5 px-4 font-normal text-center">ស្ថានភាព</th>
                          <th className="py-2.5 px-4 font-normal">សម្គាល់</th>
                          <th className="py-2.5 px-4 text-right font-normal">វិធីកត់ត្រា</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-[11px] sm:text-xs">
                        {attendanceRecords
                          .filter(r => r.date === selectedDate)
                          .map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50/20 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-500">{record.teacherId}</td>
                              <td className="py-3 px-4 font-bold font-sans text-slate-800">{record.teacherName}</td>
                              <td className="py-3 px-4 font-sans">{record.className}</td>
                              <td className="py-3 px-4 font-sans font-medium text-slate-600">{record.subject}</td>
                              <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">{record.timeSlot}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold ${
                                  record.status === 'វត្តមាន' 
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                                    : record.status === 'ច្បាប់' 
                                      ? 'bg-amber-55 text-amber-800 border border-amber-100' 
                                      : 'bg-rose-50 text-rose-800 border border-rose-100'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-450 italic truncate max-w-[150px] font-sans" title={record.remarks}>
                                {record.remarks || '-'}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-400 font-sans text-[10px]">
                                {record.scannedAt ? 'ស្កេនស្វ័យប្រវត្តិ (QR)' : 'បញ្ចូលដោយដៃ (Manual)'}
                              </td>
                            </tr>
                        ))}

                        {attendanceRecords.filter(r => r.date === selectedDate).length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                              មិនទាន់មានទិន្នន័យវត្តមានកត់ត្រាក្នុងថ្ងៃ {selectedDate} នេះទេ។ សូមប្តូរទៅកាន់ផ្ទាំង <strong>«កត់វត្តមានប្រចាំថ្ងៃ»</strong> ដើម្បីស្រង់។
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <AttendanceTracker
                teachers={teachers}
                attendanceRecords={attendanceRecords}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onSaveAttendanceBatch={handleSaveAttendanceBatch}
              />
            )}

            {activeTab === 'teachers' && (
              <TeacherManagement
                teachers={teachers}
                onAddTeacher={handleAddTeacher}
                onUpdateTeacher={handleUpdateTeacher}
                onDeleteTeacher={handleDeleteTeacher}
                onImportTeachers={handleImportTeachers}
              />
            )}

            {activeTab === 'qrcode' && (
              <QRScanner
                teachers={teachers}
                attendanceRecords={attendanceRecords}
                selectedDate={selectedDate}
                onAddAttendanceSingle={handleAddAttendanceSingle}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* 4. Elegant Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-slate-400 text-xs font-sans space-y-1 mt-12 no-print">
        <p className="font-semibold text-slate-500">
          ប្រព័ន្ធស្កេន និងគ្រប់គ្រងវត្តមានគ្រូបង្រៀន © {new Date().getFullYear()} រក្សាសិទ្ធិគ្រប់យ៉ាង
        </p>
        <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-sans">
          <span>រចនាឡើងជាមួយអន្តរមុខរលូនស្រស់ស្អាត</span>
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>សម្រាប់គ្រប់គ្រងសាលារៀនកម្ពុជា</span>
        </p>
      </footer>
    </div>
  );
}
