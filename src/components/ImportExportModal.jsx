import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  Copy,
  Check,
  FileJson,
  Layers,
  Map,
  Shield,
  Swords,
  Coins,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { ROWS, COLS } from '../utils/constants.js';

export const IMPORT_EXPORT_SCOPES = {
  FULL: 'full',
  LEVEL: 'level',
  TOWERS: 'towers',
  ENEMIES: 'enemies'
};

export default function ImportExportModal({
  isOpen,
  onClose,
  initialTab = 'export', // 'export' | 'import'
  // Current game state to export or apply to
  levelName = 'Custom Map',
  grid,
  spawns,
  goals,
  waves,
  startingGold,
  allowedTowers,
  towers = [],
  towersData,
  enemyTypesData,
  // Callback when import is applied
  onApplyImport
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [exportScope, setExportScope] = useState(IMPORT_EXPORT_SCOPES.FULL);
  const [importScope, setImportScope] = useState('auto'); // 'auto' | 'full' | 'level' | 'towers' | 'enemies'
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setActiveTab(initialTab);
    setImportText('');
    setImportFeedback(null);
    setCopied(false);
  }, [isOpen, initialTab]);

  // Generate clean export payload depending on selected scope
  const exportPayload = useMemo(() => {
    const timestamp = new Date().toISOString();

    if (exportScope === IMPORT_EXPORT_SCOPES.LEVEL) {
      return {
        _dataType: 'td_director_level_only',
        version: '3.0',
        exportedAt: timestamp,
        levelName,
        grid,
        spawns,
        goals,
        dimensions: { rows: ROWS, cols: COLS }
      };
    }

    if (exportScope === IMPORT_EXPORT_SCOPES.TOWERS) {
      return {
        _dataType: 'td_director_towers_only',
        version: '3.0',
        exportedAt: timestamp,
        allowedTowers,
        placedTowers: towers,
        towersData
      };
    }

    if (exportScope === IMPORT_EXPORT_SCOPES.ENEMIES) {
      return {
        _dataType: 'td_director_enemies_only',
        version: '3.0',
        exportedAt: timestamp,
        waves,
        enemyTypesData
      };
    }

    // Default: FULL setup
    return {
      _dataType: 'td_director_full_package',
      version: '3.0',
      exportedAt: timestamp,
      levelName,
      startingGold,
      allowedTowers,
      grid,
      spawns,
      goals,
      waves,
      placedTowers: towers,
      towersData,
      enemyTypesData
    };
  }, [exportScope, levelName, grid, spawns, goals, waves, startingGold, allowedTowers, towers, towersData, enemyTypesData]);

  const exportJsonString = useMemo(() => {
    return JSON.stringify(exportPayload, null, 2);
  }, [exportPayload]);

  // Handle Copy to Clipboard
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(exportJsonString).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  // Handle Download .json file
  const handleDownloadFile = () => {
    const filename = `td-${exportScope}-${levelName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportJsonString);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Handle file drop / upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  // Live validation of importText
  const parsedImport = useMemo(() => {
    if (!importText.trim()) return null;

    try {
      const parsed = JSON.parse(importText);
      if (!parsed || typeof parsed !== 'object') {
        return { error: 'Invalid JSON: Expected an object at root.' };
      }

      // Check what sections exist
      const hasGrid = Array.isArray(parsed.grid) && parsed.grid.length > 0;
      const hasSpawns = Array.isArray(parsed.spawns);
      const hasGoals = Array.isArray(parsed.goals);
      const hasLevel = hasGrid || hasSpawns || hasGoals;

      const hasPlacedTowers = Array.isArray(parsed.placedTowers) || Array.isArray(parsed.towers);
      const hasAllowedTowers = Array.isArray(parsed.allowedTowers);
      const hasTowersData = Array.isArray(parsed.towersData);
      const hasTowers = hasPlacedTowers || hasAllowedTowers || hasTowersData;

      const hasWaves = Array.isArray(parsed.waves);
      const hasEnemyTypesData = Array.isArray(parsed.enemyTypesData);
      const hasEnemies = hasWaves || hasEnemyTypesData;

      const hasGold = typeof parsed.startingGold === 'number';

      return {
        valid: true,
        data: parsed,
        sections: {
          level: hasLevel,
          towers: hasTowers,
          enemies: hasEnemies,
          economy: hasGold
        },
        dataType: parsed._dataType || 'generic_td_data'
      };
    } catch (err) {
      return { error: `JSON Parse Error: ${err.message}` };
    }
  }, [importText]);

  // Execute import application
  const handleExecuteImport = () => {
    if (!parsedImport?.valid || !parsedImport.data) return;

    const raw = parsedImport.data;
    const targetScope = importScope;
    const changes = [];

    const importPayload = {};

    // 1. Level Layout Import
    if (targetScope === 'auto' || targetScope === 'full' || targetScope === 'level') {
      if (Array.isArray(raw.grid)) {
        importPayload.grid = raw.grid;
        changes.push('Labyrinth Grid');
      }
      if (Array.isArray(raw.spawns)) {
        importPayload.spawns = raw.spawns;
        changes.push(`${raw.spawns.length} Spawns`);
      }
      if (Array.isArray(raw.goals)) {
        importPayload.goals = raw.goals;
        changes.push(`${raw.goals.length} Goals`);
      }
      if (typeof raw.levelName === 'string') {
        importPayload.levelName = raw.levelName;
      }
    }

    // 2. Towers & Arsenal Import
    if (targetScope === 'auto' || targetScope === 'full' || targetScope === 'towers') {
      if (Array.isArray(raw.placedTowers) || Array.isArray(raw.towers)) {
        importPayload.towers = raw.placedTowers || raw.towers;
        changes.push(`${importPayload.towers.length} Placed Towers`);
      }
      if (Array.isArray(raw.allowedTowers)) {
        importPayload.allowedTowers = raw.allowedTowers;
        changes.push(`${raw.allowedTowers.length} Allowed Towers`);
      }
      if (Array.isArray(raw.towersData)) {
        importPayload.towersData = raw.towersData;
        changes.push('Tower Balance Specs');
      }
    }

    // 3. Enemy & Wave Setup Import
    if (targetScope === 'auto' || targetScope === 'full' || targetScope === 'enemies') {
      if (Array.isArray(raw.waves)) {
        importPayload.waves = raw.waves;
        changes.push(`${raw.waves.length} Battle Waves`);
      }
      if (Array.isArray(raw.enemyTypesData)) {
        importPayload.enemyTypesData = raw.enemyTypesData;
        changes.push('Enemy Unit Specs');
      }
    }

    // 4. Starting Economy
    if ((targetScope === 'auto' || targetScope === 'full') && typeof raw.startingGold === 'number') {
      importPayload.startingGold = raw.startingGold;
      changes.push(`Starting Gold (${raw.startingGold}🪙)`);
    }

    if (changes.length === 0) {
      setImportFeedback({ type: 'error', message: 'No compatible data found for the selected import scope.' });
      return;
    }

    if (onApplyImport) {
      onApplyImport(importPayload);
    }

    setImportFeedback({
      type: 'success',
      message: `Successfully imported: ${changes.join(', ')}!`
    });

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header with Tab Switcher & Close */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                <span>Modular Data Hub</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Export or Import full level setups or individual systems (Level, Towers, Enemies)
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-purple-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* ================= TAB 1: EXPORT ================= */}
          {activeTab === 'export' && (
            <div className="space-y-3.5">
              {/* Scope Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Export Scope:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {/* Scope 1: Full Setup */}
                  <button
                    onClick={() => setExportScope(IMPORT_EXPORT_SCOPES.FULL)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === IMPORT_EXPORT_SCOPES.FULL
                        ? 'bg-teal-950/80 border-teal-400 text-teal-200 shadow-sm font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>Full Package</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      Map + Towers + Waves + Economy
                    </div>
                  </button>

                  {/* Scope 2: Only Level Layout */}
                  <button
                    onClick={() => setExportScope(IMPORT_EXPORT_SCOPES.LEVEL)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === IMPORT_EXPORT_SCOPES.LEVEL
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-sm font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Map className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Only Level</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      Grid walls, spawns, and goals
                    </div>
                  </button>

                  {/* Scope 3: Only Towers */}
                  <button
                    onClick={() => setExportScope(IMPORT_EXPORT_SCOPES.TOWERS)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === IMPORT_EXPORT_SCOPES.TOWERS
                        ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-sm font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span>Only Towers</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      Placed defenses & arsenal specs
                    </div>
                  </button>

                  {/* Scope 4: Only Enemies / Waves */}
                  <button
                    onClick={() => setExportScope(IMPORT_EXPORT_SCOPES.ENEMIES)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === IMPORT_EXPORT_SCOPES.ENEMIES
                        ? 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-sm font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <Swords className="w-3.5 h-3.5 text-rose-400" />
                      <span>Only Enemies</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                      Waves, squads & unit balance
                    </div>
                  </button>
                </div>
              </div>

              {/* JSON Live Code Viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Export JSON Output ({exportJsonString.length} bytes):</span>
                  <span className="text-[11px] text-teal-400 font-bold">Ready to export</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-teal-300 max-h-56 overflow-y-auto custom-scrollbar select-text leading-relaxed">
                  <pre>{exportJsonString}</pre>
                </div>
              </div>

              {/* Export Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 2: IMPORT ================= */}
          {activeTab === 'import' && (
            <div className="space-y-3.5">
              {/* Import Options / Filter Scope */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target Import Target Scope:
                </label>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { id: 'auto', label: '⚡ Auto-Detect Sections', color: 'teal' },
                    { id: 'full', label: 'Full Package', color: 'teal' },
                    { id: 'level', label: 'Only Level Layout', color: 'emerald' },
                    { id: 'towers', label: 'Only Towers / Arsenal', color: 'purple' },
                    { id: 'enemies', label: 'Only Enemies / Waves', color: 'rose' }
                  ].map(sc => (
                    <button
                      key={sc.id}
                      onClick={() => setImportScope(sc.id)}
                      className={`px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                        importScope === sc.id
                          ? 'bg-purple-950 border-purple-400 text-purple-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drag / File Picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-950/90 border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-xl p-4 text-center cursor-pointer transition-colors group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-6 h-6 text-slate-500 group-hover:text-purple-400 mx-auto mb-1.5 transition-colors" />
                <div className="text-xs font-bold text-slate-300 group-hover:text-purple-300">
                  Click to Browse or Drop a .JSON file here
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Supports full TD packages or standalone level/tower/wave files
                </div>
              </div>

              {/* Raw JSON Input Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Or Paste JSON Directly:</span>
                  {importText && (
                    <button
                      onClick={() => setImportText('')}
                      className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear Input
                    </button>
                  )}
                </div>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={`{\n  "levelName": "Custom Valley",\n  "grid": [...],\n  "waves": [...]\n}`}
                  rows={5}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-purple-400 resize-none custom-scrollbar"
                />
              </div>

              {/* Live JSON Detection Feedback */}
              {parsedImport && (
                <div className="text-xs">
                  {parsedImport.error ? (
                    <div className="bg-rose-950/60 border border-rose-500/40 p-2.5 rounded-xl text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{parsedImport.error}</span>
                    </div>
                  ) : (
                    <div className="bg-emerald-950/50 border border-emerald-500/40 p-2.5 rounded-xl space-y-1.5 text-emerald-200">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Valid JSON Detected ({parsedImport.dataType})</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-mono">
                        <span className={`px-2 py-0.5 rounded ${parsedImport.sections.level ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-900 text-slate-500'}`}>
                          {parsedImport.sections.level ? '✔ Level Grid/Spawns' : '✖ No Level Data'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${parsedImport.sections.towers ? 'bg-purple-900 text-purple-200' : 'bg-slate-900 text-slate-500'}`}>
                          {parsedImport.sections.towers ? '✔ Towers / Arsenal' : '✖ No Towers'}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${parsedImport.sections.enemies ? 'bg-rose-900 text-rose-200' : 'bg-slate-900 text-slate-500'}`}>
                          {parsedImport.sections.enemies ? '✔ Waves / Enemies' : '✖ No Waves'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Message / Feedback */}
              {importFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                  importFeedback.type === 'success' ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-300' : 'bg-rose-950 border border-rose-500/50 text-rose-300'
                }`}>
                  {importFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <span>{importFeedback.message}</span>
                </div>
              )}

              {/* Apply Import Button */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecuteImport}
                  disabled={!parsedImport?.valid}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition-all cursor-pointer ${
                    parsedImport?.valid
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Apply Import Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
