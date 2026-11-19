import React, { useEffect, useState } from 'react';
import { Plus, RotateCcw, Save, Settings2, Trash2, X } from 'lucide-react';
import {
  InspectionAssetCategory,
  InspectionChecklistItemSpec,
  InspectionTemplate,
  UserProfile
} from '../../../types';
import { DEFAULT_INSPECTION_TEMPLATES } from '../../../core/electrical/inspections';
import { canManageInspectionTemplates } from '../../../core/electrical/permissions';

interface InspectionTemplatesModalProps {
  isOpen: boolean;
  templates: Record<InspectionAssetCategory, InspectionTemplate>;
  userRole?: UserProfile['role'] | null;
  userEmail?: string | null;
  onClose: () => void;
  onSaveTemplate: (template: InspectionTemplate) => Promise<void>;
}

const CATEGORIES: { id: InspectionAssetCategory; label: string }[] = [
  { id: 'CIRCUIT_BREAKER', label: 'Circuit Breakers' },
  { id: 'TRANSFORMER', label: 'Transformers' },
  { id: 'MOTOR', label: 'Motors' },
  { id: 'MCC_DB', label: 'MCCs & DBs' }
];

export const InspectionTemplatesModal: React.FC<InspectionTemplatesModalProps> = ({
  isOpen,
  templates,
  userRole,
  userEmail,
  onClose,
  onSaveTemplate
}) => {
  const canManage = canManageInspectionTemplates(userRole, userEmail);
  const [selectedCategory, setSelectedCategory] =
    useState<InspectionAssetCategory>('CIRCUIT_BREAKER');
  const [draft, setDraft] = useState<InspectionTemplate>(
    templates.CIRCUIT_BREAKER
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDraft(JSON.parse(JSON.stringify(templates[selectedCategory])));
    setFeedback(null);
    setError(null);
  }, [isOpen, selectedCategory, templates]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const nextItem: InspectionChecklistItemSpec = {
      id: `custom_${Date.now().toString(36)}`,
      label: 'New Inspection Check',
      guidance: '',
      required: true
    };
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, nextItem]
    }));
  };

  const handleUpdateItem = (
    idx: number,
    patch: Partial<InspectionChecklistItemSpec>
  ) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...patch } : item))
    }));
  };

  const handleRemoveItem = (idx: number) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleResetDefaults = () => {
    const def = DEFAULT_INSPECTION_TEMPLATES[selectedCategory];
    setDraft({
      ...JSON.parse(JSON.stringify(def)),
      version: draft.version
    });
    setFeedback('Loaded factory defaults — click Save Template to apply.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || saving) return;
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      await onSaveTemplate(draft);
      setFeedback(`Saved "${draft.title}" (v${(draft.version || 1) + 1}).`);
    } catch (err: any) {
      setError(err?.message || 'Failed to save inspection template.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-4 flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-amber-300" />
            <div>
              <h3 className="text-sm font-bold">
                Engineering Inspection Checklist Templates
              </h3>
              <p className="text-[11px] text-slate-300">
                Admin-configured inspection standards per electrical equipment category
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-1.5 shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded text-xs font-bold cursor-pointer transition ${
                selectedCategory === cat.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs bg-[#f8f9fa]">
          {!canManage && (
            <div className="p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
              Read-only view: Only Engineering Administrators (Admin or Engineering Manager) can modify inspection templates.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Template Title *</label>
              <input
                type="text"
                required
                disabled={!canManage}
                value={draft.title}
                onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <input
                type="text"
                disabled={!canManage}
                value={draft.description}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, description: e.target.value }))
                }
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase text-[11px]">
                Checklist Items ({draft.items.length}) • v{draft.version}
              </span>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {draft.items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      disabled={!canManage}
                      value={item.label}
                      onChange={(e) => handleUpdateItem(idx, { label: e.target.value })}
                      placeholder="Checklist item label"
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      disabled={!canManage}
                      value={item.guidance || ''}
                      onChange={(e) => handleUpdateItem(idx, { guidance: e.target.value })}
                      placeholder="Engineering inspection guidance"
                      className="w-full px-2 py-1 rounded border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end gap-2">
                    <label className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        disabled={!canManage}
                        checked={item.required}
                        onChange={(e) => handleUpdateItem(idx, { required: e.target.checked })}
                      />
                      <span>Req</span>
                    </label>
                    {canManage && draft.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {feedback && (
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              {feedback}
            </div>
          )}
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Close
            </button>
            {canManage && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded bg-[#1b4332] hover:bg-[#143326] text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving Template...' : 'Save Template'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
