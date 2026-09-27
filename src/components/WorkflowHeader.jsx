import React, { useState } from 'react';
import {
  Map,
  Users,
  Coins,
  Play,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Wrench,
  Gamepad2,
  Database
} from 'lucide-react';
import { LEVEL_PRESETS } from '../data/levelPresets.js';

export const WORKFLOW_STEPS = {
  LAYOUT: 'layout',
  WAVES: 'waves',
  ECONOMY: 'economy',
  PLAYTEST: 'playtest'
};

export const WORKSPACES = {
  LEVEL_EDITOR: 'level_editor',
  PLAYTEST: 'playtest_sandbox',
  ASSET_STUDIO: 'asset_studio'
};

export default function WorkflowHeader({
  activeWorkspace,
  setActiveWorkspace,
  activeStep,
  setActiveStep,
  pathValidation,
  wavesCount = 1,
  startingGold = 500,
  allowedTowersCount = 9,
  onLoadPreset,
  onExportLevel,
  onOpenImport,
  onOpenArchive
}) {
  const [presetDropdown, setPresetDropdown] = useState(false);

  const steps = [
    {
      id: WORKFLOW_STEPS.LAYOUT,
      number: '1',
      title: 'Layout',
      subtitle: `${pathValidation?.spawnsCount || 1}S • ${pathValidation?.goalsCount || 1}G`,
      icon: Map,
      status: pathValidation?.isValid ? 'valid' : 'invalid'
    },
    {
      id: WORKFLOW_STEPS.WAVES,
      number: '2',
      title: 'Waves',
      subtitle: `${wavesCount} Waves`,
      icon: Users,
      status: wavesCount > 0 ? 'valid' : 'pending'
    },
    {
      id: WORKFLOW_STEPS.ECONOMY,
      number: '3',
      title: 'Arsenal',
      subtitle: `${startingGold}🪙 • ${allowedTowersCount}T`,
      icon: Coins,
      status: allowedTowersCount > 0 ? 'valid' : 'pending'
    },
    {
      id: WORKFLOW_STEPS.PLAYTEST,
      number: '4',
      title: 'Live Data',
      subtitle: 'Pacing & Sim',
      icon: Play,
      status: pathValidation?.isValid ? 'ready' : 'blocked'
    }
  ];

  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 shadow-xl px-2.5 sm:px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-2.5 flex-shrink-0 z-30 select-none">
      {/* 1. Brand & Major 3-Page Workspace Switcher */}
      <div className="flex items-center justify-between w-full md:w-auto gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center shadow-sm flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs sm:text-sm font-black tracking-wider uppercase bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent leading-none whitespace-nowrap">
            TD Director
          </span>
        </div>

        {/* 3 Dedicated Page Switchers */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
          {/* Page 1: Level Editor */}
          <button
            id="workspace-btn-level-editor"
            onClick={() => setActiveWorkspace(WORKSPACES.LEVEL_EDITOR)}
            className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeWorkspace === WORKSPACES.LEVEL_EDITOR
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Level Editor</span>
          </button>

          {/* Page 2: Playtest Sandbox */}
          <button
            id="workspace-btn-playtest"
            onClick={() => setActiveWorkspace(WORKSPACES.PLAYTEST)}
            className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeWorkspace === WORKSPACES.PLAYTEST
                ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Playtest Sandbox</span>
          </button>

          {/* Page 3: Asset Studio */}
          <button
            id="workspace-btn-asset-studio"
            onClick={() => setActiveWorkspace(WORKSPACES.ASSET_STUDIO)}
            className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeWorkspace === WORKSPACES.ASSET_STUDIO
                ? 'bg-purple-600 text-white shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">Asset Studio</span>
          </button>
        </div>
      </div>

      {/* 2. Stepper for Playtest Sandbox Workspace or Context Header */}
      {activeWorkspace === WORKSPACES.PLAYTEST ? (
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 justify-center">
          {steps.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  id={`workflow-step-${step.id}`}
                  onClick={() => setActiveStep(step.id)}
                  className={`min-h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl border transition-all text-left flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 border-teal-400 text-white shadow-[0_0_12px_rgba(45,212,191,0.25)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                      isActive
                        ? 'bg-teal-500 text-slate-950'
                        : step.status === 'valid'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : step.status === 'invalid'
                        ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step.status === 'invalid' ? <AlertCircle className="w-3 h-3" /> : step.number}
                  </div>

                  <div>
                    <div className={`text-xs font-bold leading-tight ${isActive ? 'text-teal-300' : 'text-slate-200'}`}>
                      {step.title}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono leading-none hidden sm:block">
                      {step.subtitle}
                    </div>
                  </div>
                </button>

                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0 hidden lg:block" />
                )}
              </React.Fragment>
            );
          })}
        </nav>
      ) : activeWorkspace === WORKSPACES.LEVEL_EDITOR ? (
        <div className="text-xs font-bold text-teal-300 hidden md:flex items-center gap-2 bg-teal-950/40 px-3 py-1.5 rounded-xl border border-teal-500/30">
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>Challenge Designer • 60s Setup • 4-Phase Battle • Data Archive</span>
        </div>
      ) : (
        <div className="text-xs font-bold text-purple-300 hidden md:flex items-center gap-1.5 bg-purple-950/40 px-3 py-1.5 rounded-xl border border-purple-500/30">
          <Wrench className="w-3.5 h-3.5 text-purple-400" />
          <span>Asset Tuning • Tower Balancing • 1v1 Simulation</span>
        </div>
      )}

      {/* 3. Actions: Presets & Export */}
      <div className="flex items-center gap-1.5 self-end md:self-auto">
        {/* Presets Button for Playtest */}
        {activeWorkspace === WORKSPACES.PLAYTEST && (
          <div className="relative">
            <button
              id="btn-level-presets-dropdown"
              onClick={() => setPresetDropdown(!presetDropdown)}
              className="min-h-[36px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Presets</span>
            </button>

            {presetDropdown && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800">
                  Load Level Map
                </div>
                {LEVEL_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      if (onLoadPreset) onLoadPreset(preset);
                      setPresetDropdown(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition-colors text-xs space-y-0.5 cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-emerald-400">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {preset.tagline}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          id="btn-export-level-json"
          onClick={onExportLevel}
          title="Export JSON (Full or Subsets)"
          className="min-h-[36px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        <button
          id="btn-import-level-json"
          onClick={onOpenImport}
          title="Import JSON (Full or Subsets)"
          className="min-h-[36px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden sm:inline">Import</span>
        </button>
      </div>
    </header>
  );
}
