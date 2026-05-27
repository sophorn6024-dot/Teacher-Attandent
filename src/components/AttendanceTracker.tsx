/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, ClipboardList, CheckCircle, XCircle, 
  FileText, Search, User, Download, Save, Award, RefreshCw, AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { Teacher, AttendanceRecord, AttendanceStatus, Classroom, Subject, TimeSlot } from '../types';
import { DEFAULT_CLASSES, DEFAULT_SUBJECTS, DEFAULT_TIMESLOTS } from '../constants';
import { exportAttendanceToExcel } from '../utils';

interface AttendanceTrackerProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onSaveAttendanceBatch: (records: Omit<AttendanceRecord, 'id'>[]) => void;
}

export function AttendanceTracker({
  teachers,
  attendanceRecords,
  selectedDate,
  onDateChange,
  onSaveAttendanceBatch
}: AttendanceTrackerProps) {
  // Selection states
  const [selectedClass, setSelectedClass] = useState<string>(DEFAULT_CLASSES[0].name);
  const [selectedSubject, setSelectedSubject] = useState<string>(DEFAULT_SUBJECTS[0].name);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(DEFAULT_TIMESLOTS[0].label);
  const [searchQuery, setSearchQuery] = useState('');

  // Local attendance grid state (keyed by teacher ID)
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});

  // Initialize/Load saved attendance when class, subject, date, or timeslot changes
  useEffect(() => {
    // Find saved records for this exact combination
    const matchingRecords = attendanceRecords.filter(r => 
      r.date === selectedDate && 
      r.className === selectedClass && 
      r.subject === selectedSubject && 
      r.timeSlot === selectedTimeSlot
    );

    const newStatuses: Record<string, { status: AttendanceStatus; remarks: string }> = {};

    // First populate defaults for all teachers (optional, but let's default to no status/unmarked first 
    // or let the user choose. Defaulting to 'វត្តមាន' (Present) facilitates fast record taking!)
    teachers.forEach(t => {
      newStatuses[t.id] = { status: 'វត្តមាន', remarks: '' };
    });

    // Overwrite with saved records
    matchingRecords.forEach(r => {
      newStatuses[r.teacherId] = {
        status: r.status,
        remarks: r.remarks || '',
      };
    });

    setLocalStatuses(newStatuses);
  }, [selectedClass, selectedSubject, selectedTimeSlot, selectedDate, attendanceRecords, teachers]);

  const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
    setLocalStatuses(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        status
      }
    }));
  };

  const handleRemarksChange = (teacherId: string, remarks: string) => {
    setLocalStatuses(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        remarks
      }
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated = { ...localStatuses };
    teachers.forEach(t => {
      updated[t.id] = {
        ...updated[t.id],
        status
      };
    });
    setLocalStatuses(updated);
  };

  const handleSave = () => {
    const batch: Omit<AttendanceRecord, 'id'>[] = teachers.map(t => {
      const record = localStatuses[t.id] || { status: 'វត្តមាន', remarks: '' };
      return {
        date: selectedDate,
        teacherId: t.id,
        teacherName: t.name,
        className: selectedClass,
        subject: selectedSubject,
        timeSlot: selectedTimeSlot,
        status: record.status,
        remarks: record.remarks,
      };
    });

    onSaveAttendanceBatch(batch);
    alert('វត្តមានត្រូវបានកត់ត្រា និងរក្សាទុកដោយជោគជ័យ! Attendance Saved Successfully.');
  };

  const handleExcelExport = () => {
    // Gather matching records for this configuration
    const matchingRecords = attendanceRecords.filter(r => 
      r.date === selectedDate && 
      r.className === selectedClass
    );

    if (matchingRecords.length === 0) {
      // Prompt warning or export the current local unsaved details
      const confirmState = confirm('មិនមានប្រវត្តិវត្តមានដែលរក្សាទុកសម្រាប់ថ្នាក់នេះទេ! តើអ្នកចង់នាំចេញទិន្នន័យបច្ចុប្បន្នលើអេក្រង់នេះទេ?');
      if (confirmState) {
        const tempRecords: AttendanceRecord[] = teachers.map((t, idx) => ({
          id: `TEMP-${idx}`,
          date: selectedDate,
          teacherId: t.id,
          teacherName: t.name,
          className: selectedClass,
          subject: selectedSubject,
          timeSlot: selectedTimeSlot,
          status: (localStatuses[t.id]?.status || 'វត្តមាន'),
          remarks: (localStatuses[t.id]?.remarks || ''),
        }));
        exportAttendanceToExcel(tempRecords, selectedDate, selectedClass);
      }
    } else {
      exportAttendanceToExcel(matchingRecords, selectedDate, selectedClass);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Configuration Ribbon Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-md font-bold text-slate-900 font-sans flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-teal-600" />
          <span>ការកំណត់ថ្នាក់រៀន និង មុខវិជ្ជា (Daily Sheet Setup)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Class selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 font-sans">ជ្រើសរើសថ្នាក់រៀន (Class)</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-sans cursor-pointer font-medium"
            >
              {DEFAULT_CLASSES.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subject selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 font-sans">មុខវិជ្ជាបង្រៀន (Subject)</label>
            <select 
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-sans cursor-pointer font-medium"
            >
              {DEFAULT_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Timeslot selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 font-sans">ម៉ោងសិក្សា (Session Time)</label>
            <select 
              value={selectedTimeSlot} 
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2.5 px-3 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-sans cursor-pointer font-medium"
            >
              {DEFAULT_TIMESLOTS.map((ts) => (
                <option key={ts.id} value={ts.label}>{ts.label}</option>
              ))}
            </select>
          </div>

          {/* Date Picker selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 font-sans">កាលបរិច្ឆេទ (Date)</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 py-2 px-3 pl-10 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-sans cursor-pointer font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid table with Teacher statuses */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Quick Toolbar */}
        <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="ស្វែងរកគ្រូក្នុងថ្នាក់នេះ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-sans bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Mark All Present */}
            <button
              onClick={() => handleMarkAll('វត្តមាន')}
              className="px-3.5 py-1.5 border border-teal-100 hover:bg-teal-50 text-teal-700 bg-white rounded-xl text-xs font-semibold font-sans transition-colors"
            >
              កំណត់វត្តមានទាំងអស់
            </button>

            {/* Export Current Class Sheets to Excel */}
            <button
              onClick={handleExcelExport}
              className="px-3.5 py-1.5 border border-emerald-100 hover:bg-emerald-50 text-emerald-700 bg-white rounded-xl text-xs font-semibold font-sans transition-colors flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              នាំចេញ Excel ថ្នាក់នេះ
            </button>
          </div>
        </div>

        {/* Teachers list and checklist */}
        <div id="attendance-list-container" className="divide-y divide-slate-100">
          {filteredTeachers.map((t) => {
            const currentItem = localStatuses[t.id] || { status: 'វត្តមាន', remarks: '' };
            const status = currentItem.status;

            return (
              <div 
                key={t.id} 
                className="p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 hover:bg-slate-50/35 transition-colors"
              >
                {/* Profile card */}
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-600">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">{t.id}</h5>
                    <h4 className="text-sm font-bold text-slate-900 font-sans">{t.name}</h4>
                    <p className="text-[10px] text-slate-500 font-sans">ភេទ: {t.gender} | ទូរស័ព្ទ: {t.phone}</p>
                  </div>
                </div>

                {/* Status selector radio widget */}
                <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50/50 self-start sm:self-auto shrink-0 w-full sm:w-auto">
                  {/* PRESENT */}
                  <button
                    onClick={() => handleStatusChange(t.id, 'វត្តមាន')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 ${
                      status === 'វត្តមាន' 
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    វត្តមាន
                  </button>

                  {/* EXCUSED */}
                  <button
                    onClick={() => handleStatusChange(t.id, 'ច្បាប់')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 ${
                      status === 'ច្បាប់' 
                        ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/10' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    ច្បាប់
                  </button>

                  {/* ABSENT */}
                  <button
                    onClick={() => handleStatusChange(t.id, 'អវត្តមាន')}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs font-bold font-sans transition-all flex items-center justify-center gap-1.5 ${
                      status === 'អវត្តមាន' 
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/10' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    អវត្តមាន
                  </button>
                </div>

                {/* Remarks comment input box */}
                <div className="w-full sm:w-60">
                  <input 
                    type="text"
                    placeholder="សម្គាល់ (ឧ. មកយឺត, ឈឺ...)"
                    value={currentItem.remarks}
                    onChange={(e) => handleRemarksChange(t.id, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs text-slate-700 font-sans focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            );
          })}

          {filteredTeachers.length === 0 && (
            <div className="p-8 text-center text-slate-400 font-sans">
              សូមចុះឈ្មោះគ្រូ ឬបញ្ចូលឯកសារ Excel ជាមុនសិន ទើបអាចស្រង់វត្តមានបាន។
            </div>
          )}
        </div>

        {/* Form action footer */}
        {filteredTeachers.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-slate-550 leading-relaxed font-sans text-center sm:text-left flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-550 mt-0.5" />
              <span>
                បន្ទាប់ពីស្រង់វត្តមានរួចរាល់ សូមចុចប៊ូតុង <strong>«រក្សាទុកវត្តមាន»</strong> ដើម្បីរក្សាទិន្នន័យក្នុងប្រព័ន្ធ។
              </span>
            </div>

            <button 
              onClick={handleSave}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-xl text-xs sm:text-sm shadow-lg shadow-teal-650/10 hover:shadow-teal-650/20 transition-all font-sans cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              <span>រក្សាទុកវត្តមាន (Save Sheet)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
