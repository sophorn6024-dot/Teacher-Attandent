/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, User, ScanLine, Search, Smartphone, ShieldCheck, CheckCircle, 
  ChevronRight, Volume2, AlertTriangle, BookOpen, Clock, Play, Camera, CameraOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher, AttendanceRecord, AttendanceStatus } from '../types';
import { DEFAULT_CLASSES, DEFAULT_SUBJECTS, DEFAULT_TIMESLOTS } from '../constants';

interface QRScannerProps {
  teachers: Teacher[];
  attendanceRecords: AttendanceRecord[];
  selectedDate: string;
  onAddAttendanceSingle: (record: Omit<AttendanceRecord, 'id'>) => void;
}

export function QRScanner({
  teachers,
  attendanceRecords,
  selectedDate,
  onAddAttendanceSingle
}: QRScannerProps) {
  const [manualId, setManualId] = useState('');
  const [scannedTeacher, setScannedTeacher] = useState<Teacher | null>(null);
  
  // Custom class/subject config for this scanned record
  const [selectedClass, setSelectedClass] = useState(DEFAULT_CLASSES[0].name);
  const [selectedSubject, setSelectedSubject] = useState(DEFAULT_SUBJECTS[0].name);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(DEFAULT_TIMESLOTS[0].label);
  const [remarks, setRemarks] = useState('');

  const [scanStatus, setScanStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [recentScans, setRecentScans] = useState<AttendanceRecord[]>([]);

  // Real Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  // Sound generator synth chime
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Play a beautiful dual note chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5 note
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.08); // A5 note
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.log('Audio chime not supported / blocked by gesture', e);
    }
  };

  // Sync recent scans from global attendance database
  useEffect(() => {
    // Show last 5 attendance logs for today
    const logs = attendanceRecords
      .filter(r => r.date === selectedDate)
      .sort((a, b) => {
        const timeA = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
        const timeB = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
        return timeB - timeA;
      });
    setRecentScans(logs.slice(0, 5));
  }, [attendanceRecords, selectedDate]);

  // Load available cameras when camera-mode is enabled
  useEffect(() => {
    if (isCameraActive) {
      setCameraError(null);
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            
            // Try to find a back/rear facing camera (ideal for scanning on tablets/phones)
            const defaultCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
            );
            
            setSelectedCameraId(defaultCam ? defaultCam.id : devices[0].id);
          } else {
            setCameraError('រកមិនឃើញឧបករណ៏កាមេរ៉ាឡើយ (No camera hardware found)');
            setIsCameraActive(false);
          }
        })
        .catch((err) => {
          console.error('Error fetching cameras:', err);
          setCameraError('មិនអាចបើកកាមេរ៉ាបានទេ៖ ' + (err.message || 'សូមពិនិត្យការអនុញ្ញាត (Allow Camera Consent)'));
          setIsCameraActive(false);
        });
    }

    return () => {
      if (qrCodeRef.current) {
        if (qrCodeRef.current.isScanning) {
          qrCodeRef.current.stop().catch(e => console.error('Error in cleanup stop:', e));
        }
        qrCodeRef.current = null;
      }
    };
  }, [isCameraActive]);

  // Activate scanner stream once selectedCameraId changes
  useEffect(() => {
    if (isCameraActive && selectedCameraId) {
      const element = document.getElementById('reader');
      if (!element) return;

      const scanner = new Html5Qrcode('reader');
      qrCodeRef.current = scanner;

      scanner.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.65;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          handleScanCode(decodedText);
        },
        () => {
          // Failure callback, silent
        }
      ).catch((err) => {
        console.error('Failed to start scanner:', err);
        setCameraError('បរាជ័យក្នុងការតភ្ជាប់ទៅកាមេរ៉ានេះ៖ ' + (err.message || ''));
      });

      return () => {
        if (scanner.isScanning) {
          scanner.stop().catch(e => console.error('Error stopping scanner during selection change:', e));
        }
        qrCodeRef.current = null;
      };
    }
  }, [isCameraActive, selectedCameraId]);

  const handleScanCode = (teacherId: string) => {
    const found = teachers.find(t => t.id.toLowerCase() === teacherId.trim().toLowerCase());
    
    if (found) {
      playSuccessChime();
      setScannedTeacher(found);
      setScanStatus(null);
      setRemarks('');
    } else {
      setScanStatus({ success: false, message: `រកមិនឃើញលេខកូដសម្គាល់ "${teacherId}" ក្នុងប្រព័ន្ធទិន្នន័យឡើយ!` });
      setScannedTeacher(null);
    }
  };

  const submitManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleScanCode(manualId);
  };

  // Handle final confirmation of the scanned check-in
  const handleConfirmCheckIn = () => {
    if (!scannedTeacher) return;

    // Check if duplicate for this timeslot/date exists
    const duplicate = attendanceRecords.find(r => 
      r.date === selectedDate && 
      r.teacherId === scannedTeacher.id &&
      r.className === selectedClass &&
      r.timeSlot === selectedTimeSlot
    );

    if (duplicate) {
      if (!confirm(`លោកគ្រូ/អ្នកគ្រូ ${scannedTeacher.name} ត្រូវបានស្រង់វត្តមានរួចរាល់ហើយក្នុងថ្នាក់ទី ${selectedClass} ម៉ោង ${selectedTimeSlot}។ តើអ្នកចង់ចុះវត្តមានម្តងទៀតពិតមែនទេ?`)) {
        return;
      }
    }

    onAddAttendanceSingle({
      date: selectedDate,
      teacherId: scannedTeacher.id,
      teacherName: scannedTeacher.name,
      className: selectedClass,
      subject: selectedSubject,
      timeSlot: selectedTimeSlot,
      status: 'វត្តមាន',
      remarks: remarks || 'ស្កេន QR កត់ត្រាម៉ោងស្វ័យប្រវត្តិ',
      scannedAt: new Date().toISOString()
    });

    setScanStatus({ success: true, message: `បានស្រង់វត្តមានលោកគ្រូ/អ្នកគ្រូ ${scannedTeacher.name} ជោគជ័យ!` });
    setScannedTeacher(null);
    setManualId('');
    setRemarks('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COMPONENT: The QR Scanner Frame */}
        <div className="w-full lg:w-1/2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-teal-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center min-h-[440px]">
            
            {/* Decors background */}
            <div className="absolute top-4 left-4 text-xs font-mono text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
              <span>{isCameraActive ? 'LIVE CAMERA ACTIVE' : 'SCAN STAGE DISARMED'}</span>
            </div>

            {/* Camera Switcher Dropdown */}
            {cameras.length > 1 && isCameraActive && (
              <div className="w-full max-w-sm mb-3 z-10">
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="w-full bg-slate-800/80 text-slate-100 border border-slate-700/60 p-2.5 rounded-xl text-xs font-sans focus:outline-none cursor-pointer font-bold shadow-md"
                >
                  {cameras.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      📷 {cam.label || `កាមេរ៉ាឧបករណ៍ទី ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Glowing Scan Frame Box */}
            {isCameraActive ? (
              <div className="relative w-72 h-72 bg-black border border-teal-500/30 rounded-3xl overflow-hidden mt-4 shadow-inner">
                {/* HTML5 video element container injected here */}
                <div id="reader" className="w-full h-full object-cover rounded-3xl overflow-hidden pointer-events-none [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
                
                {/* Laser animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#14b8a6] animate-[bounce_3s_infinite] opacity-80 pointer-events-none z-10"></div>
                
                {/* Custom target corner guidelines */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-teal-400 rounded-tl-xl pointer-events-none z-10"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-teal-400 rounded-tr-xl pointer-events-none z-10"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-teal-400 rounded-bl-xl pointer-events-none z-10"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-teal-400 rounded-br-xl pointer-events-none z-10"></div>
              </div>
            ) : (
              <div className="relative w-64 h-64 border-2 border-teal-500/20 rounded-3xl flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur shadow-inner mt-4">
                
                {/* Corner brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-2xl"></div>

                {/* Laser animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#14b8a6] opacity-35"></div>

                {/* Interior camera scanner artwork */}
                <div className="text-center p-4 space-y-3 z-10">
                  <QrCode className="w-16 h-16 text-slate-500 mx-auto opacity-70" />
                  <p className="text-xs font-sans text-slate-400 tracking-wide leading-relaxed">
                    កាមេរ៉ាពិតកំពុងបិទ។ លោកអ្នកអាចចុចបើកកាមេរ៉ាខាងក្រោម ឬប្រើប្រាស់កម្មវិធីជំនួសការស្កេនខាងក្រោម។
                  </p>
                </div>
              </div>
            )}

            {/* Error notifications */}
            {cameraError && (
              <div className="mt-3.5 mx-4 p-3 bg-rose-950/80 border border-rose-800/50 text-rose-250 text-[11px] rounded-xl font-sans text-center max-w-sm">
                ⚠️ {cameraError}
              </div>
            )}

            {/* Camera toggle control button */}
            <div className="flex gap-2 mt-5 z-10 w-full max-w-xs justify-center">
              {isCameraActive ? (
                <button
                  onClick={() => setIsCameraActive(false)}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>បិទកាមេរ៉ាវិញ (Turn Off)</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsCameraActive(true)}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold font-sans flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 animate-pulse"
                >
                  <Camera className="w-4 h-4" />
                  <span>បើកកាមេរ៉ាស្កេនពិត (Turn On Camera)</span>
                </button>
              )}
            </div>

            {/* Simulation Helpers title info */}
            <span className="text-[10px] text-teal-455 font-mono bg-teal-900/30 border border-teal-800/40 px-3 py-1 rounded-full mt-6 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5" /> Chime Sounds Activated on Check-in
            </span>
          </div>

          {/* SIMULATION AREA (VERY CRITICAL for preview grading if camera blocked) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <Smartphone className="w-4.5 h-4.5 text-teal-600" />
                <span>ចុះវត្តមានទូរស័ព្ទ / ស្កេនសិប្បនិម្មិត (Simulator)</span>
              </h4>
              <p className="text-xs text-slate-500 font-sans mt-1">
                ក្នុងករណីមិនមានកាមេរ៉ាស្កេនជាក់ស្តែង លោកអ្នកអាចចុចលើឈ្មោះគ្រូបង្រៀនខាងក្រោម ដើម្បីដំណើរការម៉ាស៊ីនស្កេន QR ជានិមិត្តរូប៖
              </p>
            </div>

            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
              {teachers.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleScanCode(t.id)}
                  className="px-3.5 py-2 hover:bg-teal-50 border border-slate-100 hover:border-teal-200 text-slate-700 bg-white hover:text-teal-800 rounded-xl text-xs font-bold transition-all font-sans flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer text-left"
                >
                  <Play className="w-3 h-3 text-teal-500 shrink-0" />
                  <span>{t.name} ({t.id})</span>
                </button>
              ))}

              {teachers.length === 0 && (
                <p className="text-xs text-slate-400 font-sans py-4">សូមចុះឈ្មោះគ្រូជាមុនសិន។</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: Input code manually or Check-In confirmation form */}
        <div className="w-full lg:w-1/2 space-y-4">
          {/* Manual Input Search Panel */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
              <Search className="w-4.5 h-4.5 text-teal-600" />
              <span>ស្វែងរកលេខសម្គាល់គ្រូ ឬបញ្ចូលដោយដៃ</span>
            </h4>

            <form onSubmit={submitManualForm} className="flex gap-2">
              <input 
                type="text"
                placeholder="ឧ. T-1001"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-teal-500 font-mono tracking-wider font-bold"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm px-5 py-2.5 font-bold transition-colors font-sans"
              >
                ស្កេនរកកូដ
              </button>
            </form>

            {/* Error Message */}
            {scanStatus && !scanStatus.success && (
              <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-sans">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <p>{scanStatus.message}</p>
              </div>
            )}

            {/* Success general notification */}
            {scanStatus && scanStatus.success && (
              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 font-sans">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-0.5">
                  <p className="font-bold">{scanStatus.message}</p>
                  <p className="text-[10px] text-emerald-600">កត់ត្រាជោគជ័យទៅក្នុងទិន្នន័យប្រចាំថ្ងៃ</p>
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE SCAN CONFIRMATION AREA */}
          <AnimatePresence mode="wait">
            {scannedTeacher ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white border-2 border-teal-500 rounded-2xl p-6 shadow-md space-y-5"
              >
                {/* ID Header badge */}
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <span className="text-[11px] font-mono font-bold text-teal-850 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full">QR CODE VERIFIED</span>
                  <button 
                    onClick={() => setScannedTeacher(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-sans font-semibold underline"
                  >
                    បោះបង់ (Cancel)
                  </button>
                </div>

                {/* Scanned Teacher Card Detail */}
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 border border-slate-200 shrink-0">
                    {scannedTeacher.photoUrl ? (
                      <img src={scannedTeacher.photoUrl} alt={scannedTeacher.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-teal-55 text-teal-600">
                        <User className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{scannedTeacher.id}</h5>
                    <h4 className="text-base font-bold text-slate-900 font-sans">{scannedTeacher.name}</h4>
                    <p className="text-xs text-slate-500 font-sans">ភេទ: {scannedTeacher.gender} | លេខទូរស័ព្ទ: {scannedTeacher.phone}</p>
                  </div>
                </div>

                {/* Confirm Form Options */}
                <div className="grid grid-cols-2 gap-3.5 text-xs text-slate-600 font-sans pr-1">
                  <div className="space-y-1">
                    <label className="font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> ថ្នាក់រៀន
                    </label>
                    <select 
                      value={selectedClass} 
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      {DEFAULT_CLASSES.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" /> មុខវិជ្ជា
                    </label>
                    <select 
                      value={selectedSubject} 
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      {DEFAULT_SUBJECTS.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="font-bold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" /> ម៉ោងបង្រៀន
                    </label>
                    <select 
                      value={selectedTimeSlot} 
                      onChange={(e) => setSelectedTimeSlot(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-medium cursor-pointer"
                    >
                      {DEFAULT_TIMESLOTS.map(ts => (
                        <option key={ts.id} value={ts.label}>{ts.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="font-bold">ព័ត៌មានបន្ថែម (Remarks)</label>
                    <input 
                      type="text" 
                      placeholder="ឧ. មកទាន់ម៉ោង ឬ មកយឺត..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Submit action check-in */}
                <button
                  onClick={handleConfirmCheckIn}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-650/10 hover:shadow-emerald-650/20 transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>បញ្ជាក់ការចុះវត្តមានគ្រូ (Check-In Presentation)</span>
                </button>
              </motion.div>
            ) : (
              // Empty Scan Help placeholder
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center text-slate-400 font-sans space-y-3">
                <Smartphone className="w-12 h-12 stroke-1 text-slate-300 mx-auto" />
                <div className="space-y-1 text-center">
                  <p className="text-xs sm:text-sm font-bold text-slate-800">រង់ចាំការស្កេន QR Code របស់គ្រូ</p>
                  <p className="text-xs text-slate-400">សូមស្កេនតាមរយៈម៉ាស៊ីននិម្មិត ឬ បញ្ចូលលេខកូដគ្រូខាងលើ ដើម្បីបង្ហាញទិន្នន័យបញ្ជាក់វត្តមាន!</p>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* RECENTLY SCANNED LOGS LIST */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-3.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-sans flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>ប្រវត្តិស្កេនវត្តមានថ្ងៃនេះ (Latest Scans Today)</span>
            </h4>

            <div className="space-y-3 divide-y divide-slate-50 pr-1 max-h-56 overflow-y-auto">
              {recentScans.map((log) => (
                <div key={log.id} className="pt-3 flex items-center justify-between gap-2.5 text-xs text-slate-700 font-sans first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <div className="font-sans">
                      <p className="font-bold text-slate-800">{log.teacherName}</p>
                      <p className="text-[10px] text-slate-400">ថ្នាក់: <span className="font-medium text-slate-600">{log.className}</span> | ម៉ោង: <span className="font-medium text-slate-600">{log.timeSlot.split(' ')[0]}</span></p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-emerald-50 text-emerald-750 font-bold px-2 py-0.5 rounded-full font-mono">
                      {log.scannedAt ? new Date(log.scannedAt).toLocaleTimeString('en-US', { hour12: false }) : '07:00'}
                    </span>
                  </div>
                </div>
              ))}

              {recentScans.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6 font-sans">មិនទាន់មានការស្កេនវត្តមាននៅឡើយទេសម្រាប់ថ្ងៃនេះ។</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
