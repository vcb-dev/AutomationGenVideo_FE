'use client';

import { useState, useEffect } from 'react';
import { X, Plus, FileText, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];   // e.g. ['tên_sản_phẩm', 'giá']
  hashtags?: string[];
  createdAt: string;
}

const STORAGE_KEY = 'compose_templates';

function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g) || [];
  return Array.from(new Set(matches.map(m => m.slice(1, -1))));
}

function applyVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => vars[key] || `{${key}}`);
}

// ── Storage helpers ──────────────────────────────────────────────────────────

function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

// ── Sub-component: Fill variables form ──────────────────────────────────────

function FillVariablesForm({ template, onApply, onCancel }: {
  template: Template;
  onApply: (text: string, hashtags: string[]) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  const preview = applyVariables(template.content, values);
  const allFilled = template.variables.every(v => values[v]?.trim());

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Điền biến động</p>
        <div className="space-y-2">
          {template.variables.map(v => (
            <div key={v}>
              <label className="text-xs font-bold text-slate-600 block mb-1">{`{${v}}`}</label>
              <input
                type="text"
                placeholder={`Nhập ${v}...`}
                value={values[v] || ''}
                onChange={e => setValues(prev => ({ ...prev, [v]: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Xem trước</p>
        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto border border-slate-200">
          {preview}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          Huỷ
        </button>
        <button
          onClick={() => onApply(preview, template.hashtags || [])}
          className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  currentMessage: string;
  currentHashtags: string[];
  onApply: (message: string, hashtags: string[]) => void;
}

export default function TemplateManager({ currentMessage, currentHashtags, onApply }: Props) {
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [showPanel, setShowPanel]     = useState(false);
  const [editing, setEditing]         = useState<Template | null>(null);
  const [filling, setFilling]         = useState<Template | null>(null);
  const [newName, setNewName]         = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  useEffect(() => { if (showPanel) setTemplates(loadTemplates()); }, [showPanel]);

  const handleSave = () => {
    if (!newName.trim()) return toast.error('Nhập tên template');
    if (!currentMessage.trim()) return toast.error('Nội dung trống');

    const tpl: Template = {
      id: Date.now().toString(),
      name: newName.trim(),
      content: currentMessage,
      variables: extractVariables(currentMessage),
      hashtags: currentHashtags,
      createdAt: new Date().toISOString(),
    };

    const updated = [tpl, ...templates];
    setTemplates(updated);
    saveTemplates(updated);
    setNewName('');
    setShowSaveForm(false);
    toast.success(`Đã lưu template "${tpl.name}"`);
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    toast.success('Đã xoá template');
  };

  const handleUseTemplate = (tpl: Template) => {
    if (tpl.variables.length > 0) {
      setFilling(tpl);
    } else {
      onApply(tpl.content, tpl.hashtags || []);
      setShowPanel(false);
      toast.success(`Đã áp dụng template "${tpl.name}"`);
    }
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setShowPanel(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
          showPanel ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
        }`}
      >
        <FileText className="w-3.5 h-3.5" />
        Template
        {templates.length > 0 && (
          <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{templates.length}</span>
        )}
        {showPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            className="absolute left-0 top-10 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-800">📄 Template nội dung</h3>
              <button onClick={() => setShowPanel(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[480px] overflow-y-auto">
              {/* Fill variables form */}
              {filling ? (
                <FillVariablesForm
                  template={filling}
                  onApply={(text, tags) => {
                    onApply(text, tags);
                    setFilling(null);
                    setShowPanel(false);
                    toast.success('Đã áp dụng template');
                  }}
                  onCancel={() => setFilling(null)}
                />
              ) : (
                <>
                  {/* Save current as template */}
                  <div>
                    <button
                      onClick={() => setShowSaveForm(v => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Lưu nội dung hiện tại làm template
                    </button>

                    <AnimatePresence>
                      {showSaveForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 space-y-2">
                            <input
                              type="text"
                              placeholder="Tên template (VD: Bài giới thiệu sản phẩm vàng)"
                              value={newName}
                              onChange={e => setNewName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSave()}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                              autoFocus
                            />
                            <p className="text-[10px] text-slate-400">
                              Dùng <code className="bg-slate-100 px-1 rounded">{'{tên_biến}'}</code> để tạo biến động trong nội dung
                            </p>
                            {extractVariables(currentMessage).length > 0 && (
                              <p className="text-[10px] text-indigo-600 font-semibold">
                                Phát hiện biến: {extractVariables(currentMessage).map(v => `{${v}}`).join(', ')}
                              </p>
                            )}
                            <button onClick={handleSave} className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">
                              Lưu template
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Template list */}
                  {templates.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-400">Chưa có template nào</p>
                      <p className="text-xs text-slate-300 mt-1">Soạn nội dung và lưu làm template để dùng lại</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Danh sách template ({templates.length})</p>
                      {templates.map(tpl => (
                        <div key={tpl.id} className="border border-slate-200 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                          <div className="flex items-start gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{tpl.name}</p>
                              {tpl.variables.length > 0 && (
                                <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">
                                  Biến: {tpl.variables.map(v => `{${v}}`).join(', ')}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{tpl.content}</p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleUseTemplate(tpl)}
                                className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                Dùng
                              </button>
                              <button
                                onClick={() => handleDelete(tpl.id)}
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
