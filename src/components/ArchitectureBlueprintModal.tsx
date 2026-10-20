import React, { useState } from 'react';
import { Copy, Check, RefreshCw, Database, ExternalLink, Server, Layout, ShieldCheck } from 'lucide-react';
import { THREE_PROJECT_BLUEPRINTS } from '../utils/projectBlueprints';
import type { SheetsConnectionConfig, SheetSyncRecord } from '../types/commerce';

interface ArchitectureBlueprintPanelProps {
  sheetsConfig: SheetsConnectionConfig;
  sheetSyncLogs: SheetSyncRecord[];
  onSaveSheetsConfig: (scriptUrl: string, spreadsheetId: string) => Promise<void>;
  isSyncing: boolean;
}

export const ArchitectureBlueprintPanel: React.FC<ArchitectureBlueprintPanelProps> = ({
  sheetsConfig,
  sheetSyncLogs,
  onSaveSheetsConfig,
  isSyncing,
}) => {
  const [selectedProject, setSelectedProject] = useState<string>('backend-fastapi');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [scriptUrlInput, setScriptUrlInput] = useState(sheetsConfig.scriptUrl);
  const [sheetIdInput, setSheetIdInput] = useState(sheetsConfig.spreadsheetId);

  const activeBlueprint =
    THREE_PROJECT_BLUEPRINTS.find((b) => b.projectKey === selectedProject) || THREE_PROJECT_BLUEPRINTS[0];

  const handleCopy = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(label);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSheetsConfig(scriptUrlInput, sheetIdInput);
  };

  return (
    <div className="space-y-8">
      {/* Architecture Diagram & 3-Project Overview */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <p className="text-xs font-medium text-amber-800 tracking-wide">
              ស្ថាបត្យកម្មគម្រោងទាំង ៣ និងការដាក់ឱ្យដំណើរការលើ Vercel · 3-Project Architecture
            </p>
            <h2 className="text-xl font-bold text-stone-900 mt-1">
              React User + React Admin + Python FastAPI + Google Sheets (Apps Script)
            </h2>
          </div>
          <div className="text-xs text-stone-600 font-mono-tabular">
            <span>Rows Synced: {sheetsConfig.totalRowsSynced}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Last Sync: {sheetsConfig.lastSyncedAt}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <Layout className="w-4 h-4 text-amber-700 shrink-0" />
              <span>1. frontend-user</span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              React.js + Tailwind CSS សម្រាប់អតិថិជនទិញទំនិញ ទូទាត់ KHQR/COD និងតាមដានការបញ្ជាទិញ។
            </p>
            <p className="text-xs font-mono-tabular text-stone-500 mt-2">
              Deploy: Vercel Static SPA
            </p>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>2. frontend-admin</span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              React.js + Tailwind CSS សម្រាប់ Admin តាមដានការបញ្ជាទិញផ្ទាល់ និងគ្រប់គ្រងស្តុកស្វ័យប្រវត្តិ។
            </p>
            <p className="text-xs font-mono-tabular text-stone-500 mt-2">
              Deploy: Vercel Static SPA
            </p>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <Server className="w-4 h-4 text-amber-700 shrink-0" />
              <span>3. backend-fastapi</span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              Python + FastAPI ផ្តល់ REST API ទាំងអស់ និងគណនាស្តុក/ពិន្ទុសមាជិកមុនបញ្ជូនទៅ Google Sheet។
            </p>
            <p className="text-xs font-mono-tabular text-stone-500 mt-2">
              Deploy: Vercel @vercel/python
            </p>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <div className="flex items-center gap-2 text-stone-900 font-semibold text-sm">
              <Database className="w-4 h-4 text-amber-700 shrink-0" />
              <span>4. Google Sheets DB</span>
            </div>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
              Google Sheet + Google Apps Script (Code.gs) រក្សាទុកទិន្នន័យលើផ្ទាំង Products, Orders, Members, StockLogs។
            </p>
            <p className="text-xs font-mono-tabular text-stone-500 mt-2">
              Deploy: Apps Script Web App
            </p>
          </div>
        </div>
      </div>

      {/* Live Google Apps Script Webhook Connection Form */}
      <div className="bg-white border border-stone-200 rounded-xl p-6">
        <h3 className="text-base font-bold text-stone-900">
          ការតភ្ជាប់ Google Sheet + Google Apps Script ផ្ទាល់ (Live Database Bridge)
        </h3>
        <p className="text-sm text-stone-600 mt-1">
          បញ្ចូល Web App URL ពី Google Apps Script របស់អ្នក ដើម្បីឱ្យរាល់ការបញ្ជាទិញ និងការកាត់ស្តុករត់ចូល Google Sheet ដោយស្វ័យប្រវត្តិ។
        </p>

        <form onSubmit={handleConfigSubmit} className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-6">
            <label htmlFor="gas-url-input" className="block text-xs font-medium text-stone-700 mb-1.5">
              Google Apps Script Web App URL (doGet / doPost)
            </label>
            <input
              id="gas-url-input"
              type="text"
              value={scriptUrlInput}
              onChange={(e) => setScriptUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
            />
          </div>
          <div className="lg:col-span-4">
            <label htmlFor="sheet-id-input" className="block text-xs font-medium text-stone-700 mb-1.5">
              Google Spreadsheet ID
            </label>
            <input
              id="sheet-id-input"
              type="text"
              value={sheetIdInput}
              onChange={(e) => setSheetIdInput(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="w-full px-3.5 py-2 text-sm font-mono-tabular bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
            />
          </div>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Sheet</span>
            </button>
          </div>
        </form>
      </div>

      {/* Code Viewer for the 3 Projects + Apps Script */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="p-4 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-200/80 rounded-lg">
            {THREE_PROJECT_BLUEPRINTS.map((bp) => (
              <button
                key={bp.projectKey}
                type="button"
                onClick={() => setSelectedProject(bp.projectKey)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedProject === bp.projectKey
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {bp.projectKey === 'google-apps-script'
                  ? 'Google Apps Script (Code.gs)'
                  : bp.projectKey === 'backend-fastapi'
                    ? '1. backend (Python FastAPI)'
                    : bp.projectKey === 'frontend-user'
                      ? '2. frontend-user (React)'
                      : '3. frontend-admin (React)'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleCopy(activeBlueprint.code, activeBlueprint.filename)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedFile === activeBlueprint.filename ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>បានចម្លងកូដ (Copied)</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>ចម្លងកូដ (Copy Code)</span>
              </>
            )}
          </button>
        </div>

        <div className="p-5 border-b border-stone-200 bg-stone-50/60">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
            <span className="font-semibold text-stone-900">{activeBlueprint.projectTitle}</span>
            <span>
              File: <strong className="font-mono-tabular text-stone-900">{activeBlueprint.filename}</strong> · Target: {activeBlueprint.deployTarget}
            </span>
          </div>
          <p className="text-sm text-stone-600 mt-1.5">{activeBlueprint.description}</p>
        </div>

        <pre className="p-5 bg-stone-950 text-stone-100 text-xs font-mono-tabular overflow-x-auto leading-relaxed">
          <code>{activeBlueprint.code}</code>
        </pre>
      </div>

      {/* Real-Time Google Sheets Operations Log */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              កំណត់ត្រាដំណើរការទិន្នន័យជាមួយ Google Sheet (Real-Time Apps Script Log)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              រាល់សកម្មភាពបញ្ជាទិញ កាត់ស្តុក និងបន្ថែមពិន្ទុសមាជិក ត្រូវបានកត់ត្រាចូលផ្ទាំង Sheet ទាំង ៤ ភ្លាមៗ
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-stone-500">
            Tabs: Products · Orders · Members · StockLogs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600">
                <th className="py-3 px-4">Sync ID</th>
                <th className="py-3 px-4">Sheet Tab</th>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Latency</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-xs">
              {sheetSyncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/80">
                  <td className="py-3 px-4 font-mono-tabular font-medium text-stone-900">{log.id}</td>
                  <td className="py-3 px-4 font-mono-tabular text-amber-800 font-medium">{log.sheetTab}</td>
                  <td className="py-3 px-4 font-mono-tabular text-stone-600">{log.operation}</td>
                  <td className="py-3 px-4 text-stone-800">{log.summary}</td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-emerald-700">{log.latencyMs}ms</td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-stone-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
