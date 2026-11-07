'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, Trash2, X, Lock, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

interface AutoPurgeSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWipeNow: () => void;
}

export const AutoPurgeSecurityModal: React.FC<AutoPurgeSecurityModalProps> = ({
  isOpen,
  onClose,
  onWipeNow,
}) => {
  const [purgeInterval, setPurgeInterval] = useState<number>(60); // minutes (default 60 = 1 hour)
  const [isWiped, setIsWiped] = useState(false);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [isPasswordSaved, setIsPasswordSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fileforge_purge_interval');
      if (saved) setPurgeInterval(parseInt(saved, 10));
    }
  }, []);

  const handleSetInterval = (mins: number) => {
    setPurgeInterval(mins);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fileforge_purge_interval', mins.toString());
    }
  };

  const handleManualWipe = () => {
    onWipeNow();
    setIsWiped(true);
    setTimeout(() => {
      setIsWiped(false);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                Advanced Security &amp; Auto-Destruction
              </h3>
              <p className="text-[11px] text-slate-400">100% In-Browser Isolation • Zero Server Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Architecture Guarantee */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero-Cloud Privacy Guarantee</span>
            </div>
            <p className="text-[11px] text-emerald-300/80 leading-relaxed">
              Every operation runs locally in your device&apos;s WebAssembly &amp; WebWorker threads. Zero document bytes are ever uploaded or retained on any server.
            </p>
          </div>

          {/* Auto-Delete / Purge Timer */}
          <div className="space-y-2.5">
            <label className="font-bold text-white flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Auto-Delete &amp; RAM Purge Interval:</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Set how long FileForge keeps loaded documents and converted blobs in memory before automatically wiping them.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { label: 'Instant', mins: 0, sub: 'On Download' },
                { label: '5 Mins', mins: 5, sub: 'High Security' },
                { label: '15 Mins', mins: 15, sub: 'Recommended' },
                { label: '1 Hour', mins: 60, sub: 'Session' },
              ].map((opt) => (
                <button
                  key={opt.mins}
                  type="button"
                  onClick={() => handleSetInterval(opt.mins)}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    purgeInterval === opt.mins
                      ? 'bg-blue-600/30 border-blue-400 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick File Encryption Password Preset */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <label className="font-bold text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Export PDF Encryption Password:</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="Set optional PDF encryption password..."
                value={encryptionPassword}
                onChange={(e) => {
                  setEncryptionPassword(e.target.value);
                  setIsPasswordSaved(false);
                }}
                className="flex-1 bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('fileforge_default_password', encryptionPassword);
                  }
                  setIsPasswordSaved(true);
                  setTimeout(() => setIsPasswordSaved(false), 2000);
                }}
                className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500/30 transition cursor-pointer"
              >
                {isPasswordSaved ? 'Applied' : 'Apply'}
              </button>
            </div>
          </div>

          {/* Emergency Manual RAM Wipe */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white flex items-center gap-1 text-rose-300">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Immediate RAM Destruction</span>
              </div>
              <p className="text-[10px] text-slate-400">Revokes all object URLs and clears file buffers now.</p>
            </div>
            <button
              type="button"
              onClick={handleManualWipe}
              className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isWiped ? 'RAM Wiped!' : 'Wipe Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
