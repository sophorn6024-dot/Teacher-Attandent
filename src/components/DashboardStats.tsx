/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertTriangle, FileText, Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Teacher, AttendanceRecord } from '../types';

interface DashboardStatsProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: string;
}

export function DashboardStats({ teachers, attendanceRecords, selectedDate }: DashboardStatsProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter records for the selected date
  const todayRecords = attendanceRecords.filter(r => r.date === selectedDate);
  
  const presentCount = todayRecords.filter(r => r.status === 'វត្តមាន').length;
  const absentCount = todayRecords.filter(r => r.status === 'អវត្តមាន').length;
  const excusedCount = todayRecords.filter(r => r.status === 'ច្បាប់').length;
  const unmarkedCount = Math.max(0, teachers.length - todayRecords.length);

  // Time formatting
  const timeString = time.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  const khmerDays = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
  const khmerMonths = [
    'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
    'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
  ];

  const khmerDayName = khmerDays[time.getDay()];
  const khmerMonthName = khmerMonths[time.getMonth()];
  const khmerDateString = `ថ្ងៃ${khmerDayName} ទី${time.getDate()} ខែ${khmerMonthName} ឆ្នាំ${time.getFullYear()}`;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="space-y-6">
      {/* Date & Live Clock Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-950 via-slate-900 to-slate-950 gap-4">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-teal-400 font-medium">
            <Calendar className="w-5 h-5 animate-pulse" />
            <span className="text-sm tracking-wider uppercase font-sans">កាលបរិច្ឆេទ & ម៉ោងជាក់ស្តែង</span>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold font-sans tracking-wide text-slate-100">
            {khmerDateString}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Selected Date for Attendance: <span className="text-teal-400 font-bold">{selectedDate}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-700/50 shadow-inner">
          <Clock className="w-6 h-6 text-teal-400" />
          <span className="text-2xl md:text-3xl font-bold font-mono text-teal-300 tracking-wider">
            {timeString}
          </span>
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Teachers */}
        <motion.div 
          id="stat-total-teachers"
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-default"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-500 ease-out z-0"></div>
          <div className="space-y-1 relative z-10">
            <p className="text-xs md:text-sm font-medium text-slate-500">គ្រូបង្រៀនសរុប</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
              {teachers.length} <span className="text-sm font-medium text-slate-400">នាក់</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Total Staff Registered</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl relative z-10 group-hover:bg-slate-200 transition-colors">
            <Users className="w-6 h-6 md:w-7 md:h-7" />
          </div>
        </motion.div>

        {/* Present Today */}
        <motion.div 
          id="stat-present"
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 md:p-6 border border-teal-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-default"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-500 ease-out z-0"></div>
          <div className="space-y-1 relative z-10">
            <p className="text-xs md:text-sm font-medium text-teal-600">វត្តមានថ្ងៃនេះ</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-teal-600 font-sans tracking-tight">
              {presentCount} <span className="text-sm font-medium text-teal-400">នាក់</span>
            </h3>
            <p className="text-[10px] text-teal-500/80 font-mono">Present Today</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl relative z-10 group-hover:bg-teal-100 transition-colors">
            <CheckCircle className="w-6 h-6 md:w-7 md:h-7" />
          </div>
        </motion.div>

        {/* Excused Today */}
        <motion.div 
          id="stat-excused"
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 md:p-6 border border-amber-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-default"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-500 ease-out z-0"></div>
          <div className="space-y-1 relative z-10">
            <p className="text-xs md:text-sm font-medium text-amber-600">ច្បាប់ថ្ងៃនេះ</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-amber-600 font-sans tracking-tight">
              {excusedCount} <span className="text-sm font-medium text-amber-400">នាក់</span>
            </h3>
            <p className="text-[10px] text-amber-500/80 font-mono">On Authorized Leave</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl relative z-10 group-hover:bg-amber-100 transition-colors">
            <FileText className="w-6 h-6 md:w-7 md:h-7" />
          </div>
        </motion.div>

        {/* Absent Today */}
        <motion.div 
          id="stat-absent"
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 md:p-6 border border-rose-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden group cursor-default"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full translate-x-12 -translate-y-12 group-hover:scale-110 transition-transform duration-500 ease-out z-0"></div>
          <div className="space-y-1 relative z-10">
            <p className="text-xs md:text-sm font-medium text-rose-600">អវត្តមានថ្ងៃនេះ</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-rose-600 font-sans tracking-tight">
              {absentCount} <span className="text-sm font-medium text-rose-400">នាក់</span>
            </h3>
            <p className="text-[10px] text-rose-500/80 font-mono">Absent Today</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl relative z-10 group-hover:bg-rose-100 transition-colors">
            <AlertTriangle className="w-6 h-6 md:w-7 md:h-7" />
          </div>
        </motion.div>
      </motion.div>

      {/* Progress Metric bar */}
      {teachers.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between items-center text-xs md:text-sm">
            <span className="font-medium text-slate-700">អត្រាវត្តមានគ្រូបង្រៀនប្រចាំថ្ងៃ (Daily Attendance Rate)</span>
            <span className="font-bold text-teal-600 font-mono">
              {Math.round(((presentCount + excusedCount) / teachers.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
            <div 
              style={{ width: `${(presentCount / teachers.length) * 100}%` }} 
              className="bg-teal-500 h-full transition-all duration-500"
              title={`វត្តមាន: ${presentCount}`}
            />
            <div 
              style={{ width: `${(excusedCount / teachers.length) * 100}%` }} 
              className="bg-amber-400 h-full transition-all duration-500"
              title={`ច្បាប់: ${excusedCount}`}
            />
            <div 
              style={{ width: `${(absentCount / teachers.length) * 100}%` }} 
              className="bg-rose-500 h-full transition-all duration-500"
              title={`អវត្តមាន: ${absentCount}`}
            />
          </div>
          <div className="flex gap-4 text-[10px] md:text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
              <span>វត្តមាន ({presentCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
              <span>ច្បាប់ ({excusedCount})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>អវត្តមាន ({absentCount})</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block"></span>
              <span>មិនទាន់ស្រង់ ({unmarkedCount})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
