/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, FileSpreadsheet, Download, Upload, Search, 
  User, Calendar as CalendarIcon, Phone, Image as ImageIcon, QrCode, 
  Grid, List, CheckCircle, AlertCircle, X, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher } from '../types';
import { exportTeachersToExcel, downloadTeachersTemplate, parseTeachersExcel } from '../utils';

interface TeacherManagementProps {
  teachers: Teacher[];
  onAddTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt'>) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (id: string) => void;
  onImportTeachers: (newTeachers: Omit<Teacher, 'id' | 'createdAt'>[]) => void;
}

export function TeacherManagement({
  teachers,
  onAddTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onImportTeachers
}: TeacherManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showQRModal, setShowQRModal] = useState<Teacher | null>(null);
  
  // Drag & drop excel uploading states
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New properties form states
  const [formData, setFormData] = useState({
    name: '',
    gender: 'ប្រុស' as 'ប្រុស' | 'ស្រី' | 'ផ្សេងៗ',
    dob: '',
    phone: '',
    photoUrl: ''
  });

  // Toast alert manager
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData({
      name: '',
      gender: 'ប្រុស',
      dob: '1990-01-01',
      phone: '',
      photoUrl: ''
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      name: t.name,
      gender: t.gender,
      dob: t.dob,
      phone: t.phone,
      photoUrl: t.photoUrl || ''
    });
    setShowFormModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('សូមបំពេញឈ្មោះ និងលេខទូរស័ព្ទរបស់គ្រូ!');
      return;
    }

    if (editingTeacher) {
      onUpdateTeacher({
        ...editingTeacher,
        name: formData.name,
        gender: formData.gender,
        dob: formData.dob,
        phone: formData.phone,
        photoUrl: formData.photoUrl || undefined
      });
      showToast('កែប្រែទិន្នន័យគ្រូរួចរាល់! Successfully updated.');
    } else {
      onAddTeacher({
        name: formData.name,
        gender: formData.gender,
        dob: formData.dob,
        phone: formData.phone,
        photoUrl: formData.photoUrl || undefined
      });
      showToast('បានបន្ថែមគ្រូថ្មីរួចរាល់! Added new teacher.');
    }
    setShowFormModal(false);
  };

  // QR Code Image creator helper (QR API)
  const getQRUrl = (teacherId: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(teacherId)}&color=0f172a&bgcolor=ffffff`;
  };

  // Drag and drop excel loading
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setImportStatus({ success: false, message: 'សូមបញ្ចូលតែឯកសារប្រភេទ Excel (.xlsx, .xls) តែប៉ុណ្ណោះ!' });
      return;
    }

    try {
      const parsed = await parseTeachersExcel(file);
      if (parsed.length === 0) {
        setImportStatus({ success: false, message: 'គ្មានទិន្នន័យត្រឹមត្រូវក្នុងឯកសារនេះទេ។ សូមពិនិត្យមើលឯកសារគំរូ!' });
      } else {
        onImportTeachers(parsed);
        setImportStatus({ success: true, message: `បានបញ្ចូលគ្រូបង្រៀនចំនួន ${parsed.length} នាក់ ដោយជោគជ័យ!` });
        showToast(`បានបញ្ចូលគ្រូបង្រៀនចំនួន ${parsed.length} នាក់!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      setImportStatus({ success: false, message: 'មានបញ្ហាក្នុងការអានឯកសារ Excel ។ សូមប្រាកដថាទម្រង់ត្រឹមត្រូវ!' });
    }
  };

  // Filter teachers based on search query
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.phone.includes(searchQuery) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrintQR = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 16, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-teal-500"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-sans font-medium text-sm">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT COLUMN: Import & Stats */}
        <div className="w-full lg:w-1/3 space-y-6">
          {/* Excel Import Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-bold text-slate-900 font-sans flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-600" />
              <span>បញ្ចូលទិន្នន័យគ្រូតាម Excel</span>
            </h3>
            
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              លោកអ្នកអាចទាញយកគំរូ Excel រួចបំពេញទិន្នន័យគ្រូ ដើម្បីរក្សាទុក និងបញ្ចូលក្នុងប្រព័ន្ធវត្តមានម្តងទាំងអស់គ្នា។
            </p>

            {/* Template Download Option */}
            <button 
              onClick={downloadTeachersTemplate}
              className="w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors font-sans"
            >
              <Download className="w-4 h-4 text-slate-500" />
              ទាញយកឯកសារគំរូ Excel Template
            </button>

            {/* Drag & Drop Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                isDragging 
                  ? 'border-teal-500 bg-teal-50/50' 
                  : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden" 
              />
              <div className="p-3 bg-teal-50 text-teal-600 rounded-full">
                <Upload className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700 font-sans">អូសឯកសារ ឬ ចុចដើម្បីស្វែងរក</p>
                <p className="text-[10px] text-slate-400 font-mono">Accepts ONLY .xlsx, .xls sheets</p>
              </div>
            </div>

            {/* Import Feedback */}
            {importStatus && (
              <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                importStatus.success 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                  : 'bg-rose-50 text-rose-800 border border-rose-100'
              }`}>
                {importStatus.success ? (
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <div className="space-y-1">
                  <p className="font-sans font-medium">{importStatus.message}</p>
                  <button 
                    onClick={() => setImportStatus(null)} 
                    className="text-[10px] underline hover:text-slate-900"
                  >
                    បិទសារបន្ទាប
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="bg-teal-900 text-teal-100 rounded-2xl p-6 shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-800/50 rounded-full translate-x-8 -translate-y-8"></div>
            <h4 className="text-sm font-bold font-sans flex items-center gap-1.5 z-10 relative">
              <QrCode className="w-4.5 h-4.5" />
              របៀបចុះវត្តមានគ្រូតាម QR Code
            </h4>
            <ol className="text-xs list-decimal pl-4.5 space-y-2 leading-relaxed text-teal-100/90 font-sans z-10 relative">
              <li>ចុះឈ្មោះគ្រូ ឬបញ្ចូលឯកសារ Excel របស់ពួកគាត់</li>
              <li>បង្ហាញ ឬបោះពុម្ពកាត QR Code សម្រាប់គ្រូនីមួយៗ</li>
              <li>ប្តូរទៅកាន់ផ្ទាំង <strong>«ស្កេនវត្តមាន (QR System)»</strong></li>
              <li>ស្កេនកូដដើម្បីចុះវត្តមាន កំណត់ម៉ោងម៉្យាង និងកត់ត្រាដោយស្វ័យប្រវត្តិ</li>
            </ol>
          </div>
        </div>

        {/* RIGHT COLUMN: Teacher List Manager */}
        <div className="w-full lg:w-2/3 space-y-4">
          {/* Header Action bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="ស្វែងរកគ្រូ (ឈ្មោះ, លេខទូរស័ព្ទ, ល.រ)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-teal-500 font-sans"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Export Button */}
              <button 
                onClick={() => exportTeachersToExcel(teachers)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 py-2 px-3.5 rounded-xl text-xs font-semibold transition-colors font-sans"
                title="ទាញទិន្នន័យគ្រូចេញជា Excel"
              >
                <FileSpreadsheet className="w-4.5 h-4.5" />
                <span>នាំចេញ Excel</span>
              </button>

              {/* Add Button */}
              <button 
                onClick={handleOpenAdd}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-3.5 rounded-xl text-xs font-semibold shadow-md shadow-teal-600/10 hover:shadow-teal-600/20 transition-all font-sans"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>បន្ថែមគ្រូថ្មី</span>
              </button>

              {/* Layout view switcher */}
              <div className="flex border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid View Mode */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeachers.map((t) => (
                <motion.div 
                  key={t.id} 
                  layout
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow relative group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Upper profile area */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {t.photoUrl ? (
                          <img 
                            src={t.photoUrl} 
                            alt={t.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-600">
                            <User className="w-6 h-6" />
                          </div>
                        )}
                        <span className={`absolute bottom-0 right-0 px-1 py-0.5 rounded-tl-lg text-[9px] font-bold text-white ${
                          t.gender === 'ប្រុស' ? 'bg-indigo-500' : 'bg-rose-500'
                        }`}>
                          {t.gender}
                        </span>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-teal-600 uppercase bg-teal-50 px-1.5 py-0.5 rounded-md">{t.id}</span>
                        <h4 className="text-sm font-bold text-slate-800 font-sans truncate">{t.name}</h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-sans">
                          <Phone className="w-3 h-3" />
                          <span>{t.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Meta details */}
                    <div className="pt-3 border-t border-slate-50 flex justify-between text-[11px] text-slate-500 font-sans">
                      <div>
                        <span className="text-slate-400">ថ្ងៃខែឆ្នាំកំណើត</span>
                        <p className="font-semibold text-slate-700">{t.dob}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between gap-1.5">
                    {/* View QR Code button */}
                    <button 
                      onClick={() => setShowQRModal(t)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-[11px] font-sans transition-colors font-medium cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      កាត QR Code
                    </button>

                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                        title="កែប្រែ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`តើអ្នកពិតជាចង់លុបគ្រូឈ្មោះ "${t.name}" ពិតមែនទេ?`)) {
                            onDeleteTeacher(t.id);
                            showToast('បានលុបព័ត៌មានគ្រូរួចរាល់! Deleted.');
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="លុប"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {filteredTeachers.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 font-sans bg-white border border-slate-100 rounded-2xl">
                  រកមិនឃើញលោកគ្រូ/អ្នកគ្រូតាមការស្វែងរករបស់អ្នកឡើយ។
                </div>
              )}
            </div>
          ) : (
            /* Table View Mode */
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-w-full">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-[11px] font-sans font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5">រូបគ្រូ</th>
                      <th className="py-3.5 px-4">កូដសម្គាល់</th>
                      <th className="py-3.5 px-4">ឈ្មោះគ្រូ</th>
                      <th className="py-3.5 px-4">ភេទ</th>
                      <th className="py-3.5 px-4">ថ្ងៃកំណើត</th>
                      <th className="py-3.5 px-4">លេខទូរស័ព្ទ</th>
                      <th className="py-3.5 px-4 text-center">លេខកូដ QR</th>
                      <th className="py-3.5 px-5 text-right">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[12px] md:text-xs">
                    {filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {t.photoUrl ? (
                              <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-600">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-500">{t.id}</td>
                        <td className="py-3 px-4 font-bold font-sans text-slate-800">{t.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-medium ${
                            t.gender === 'ប្រុស' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-55 text-rose-700'
                          }`}>
                            {t.gender}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-650 font-sans">{t.dob}</td>
                        <td className="py-3 px-4 font-sans text-slate-600">{t.phone}</td>
                        <td className="py-3 px-4 text-center">
                          <button 
                            onClick={() => setShowQRModal(t)}
                            className="inline-flex items-center gap-1.5 p-1 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-sans text-[10px]"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-500" />
                            មើលកូដ
                          </button>
                        </td>
                        <td className="py-3 px-5 text-right space-x-1">
                          <button 
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors inline-block"
                            title="កែប្រែ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`តើអ្នកពិតជាចង់លុបគ្រូឈ្មោះ "${t.name}" ពិតមែនទេ?`)) {
                                onDeleteTeacher(t.id);
                                showToast('បានលុបព័ត៌មានគ្រូរួចរាល់! Deleted.');
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-block"
                            title="លុប"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredTeachers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                          រកមិនឃើញលោកគ្រូ/អ្នកគ្រូឡើយ។
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD OR EDIT TEACHER */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFormModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 md:p-8 shadow-2xl relative z-10 border border-slate-100 space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-md sm:text-lg font-bold text-slate-800 font-sans">
                  {editingTeacher ? 'កែប្រែទិន្នន័យលោកគ្រូ/អ្នកគ្រូ' : 'ចុះឈ្មោះគ្រូថ្មី'}
                </h3>
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 font-sans">ឈ្មោះគ្រូ (Teacher Name) *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-455" />
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="ឧ. សុខ ជា"
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-sans transition-all"
                      />
                    </div>
                  </div>

                  {/* Gender field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 font-sans">ភេទ (Gender)</label>
                    <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                      {['ប្រុស', 'ស្រី', 'ផ្សេងៗ'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFormData({ ...formData, gender: g as any })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-sans transition-all font-semibold ${
                            formData.gender === g 
                              ? 'bg-white text-teal-600 shadow-sm' 
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 font-sans">លេខទូរស័ព្ទ (Phone Number) *</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel" 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="ឧ. 012345678"
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-sans transition-all"
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 font-sans">ថ្ងៃខែឆ្នាំកំណើត (DOB)</label>
                    <div className="relative">
                      <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-333" />
                      <input 
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-sans transition-all"
                      />
                    </div>
                  </div>

                  {/* Photo URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 font-sans">តំណភ្ជាប់រូបថត (Photo URL - ស្រេចចិត្ត)</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        value={formData.photoUrl}
                        onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 font-sans transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-slate-50">
                  <button 
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-all font-sans"
                  >
                    បោះបង់
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all font-sans"
                  >
                    រក្សាទុក
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: VIEW / PRINT QR CARD */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQRModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm no-print"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative z-10 border border-slate-100 flex flex-col items-center"
            >
              <button 
                onClick={() => setShowQRModal(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors no-print"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Printable Card Area */}
              <div id="teacher-id-card" className="w-full p-4 border border-teal-500/20 rounded-2xl bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50/50 via-white to-white text-center space-y-4 shadow-sm">
                
                {/* School Header */}
                <div className="space-y-0.5 border-b border-dashed border-teal-150 pb-3">
                  <h5 className="text-[10px] font-bold text-teal-800 tracking-widest font-sans">វិទ្យាល័យរដ្ឋបាលវត្តមានគ្រូ</h5>
                  <p className="text-[8px] text-slate-400 font-mono tracking-wider">TEACHER ATTENDANCE SYSTEM</p>
                </div>

                {/* Profile Photo */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border-2 border-teal-500 mx-auto">
                  {showQRModal.photoUrl ? (
                    <img src={showQRModal.photoUrl} alt={showQRModal.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-600">
                      <User className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Information */}
                <div>
                  <h4 className="text-base font-bold text-slate-950 font-sans">{showQRModal.name}</h4>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    ភេទ: <span className="font-semibold text-slate-700">{showQRModal.gender}</span> | ទូរស័ព្ទ: <span className="font-semibold text-slate-705">{showQRModal.phone}</span>
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="bg-white border-2 border-slate-900 rounded-xl p-3 inline-block shadow-inner">
                  <img 
                    src={getQRUrl(showQRModal.id)} 
                    alt={`QR Code for ${showQRModal.id}`} 
                    className="w-40 h-40 object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Footer Unique ID */}
                <div className="space-y-1">
                  <span className="text-[12px] font-mono font-bold text-white bg-slate-900 px-3 py-1 rounded-full">{showQRModal.id}</span>
                  <p className="text-[8px] text-slate-400 font-mono pt-1">Scan for Attendance Tracker</p>
                </div>
              </div>

              {/* Print Action button */}
              <div className="w-full mt-6 grid grid-cols-2 gap-2 no-print">
                <button 
                  onClick={() => setShowQRModal(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors font-sans flex items-center justify-center gap-1"
                >
                  បិទ
                </button>
                <button 
                  onClick={handlePrintQR}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors font-sans flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  បោះពុម្ពកាត QR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Embedded print styles snippet */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #teacher-id-card, #teacher-id-card * {
            visibility: visible;
          }
          #teacher-id-card {
            position: absolute;
            left: 50%;
            top: 40%;
            transform: translate(-50%, -50%) scale(1.3);
            border: 1px solid #14b8a6 !important;
            padding: 24px !important;
            border-radius: 16px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
