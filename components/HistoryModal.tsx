import React, { useState, useEffect } from 'react';
import { getHistory, clearHistory, ReportHistoryItem } from '../utils/history';
import { models } from '../constants';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReport: (content: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelectReport }) => {
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(getHistory());
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-slate-100"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">分析历史记录</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
               <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-lg">暂无历史记录</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {history.map(item => (
                <li key={item.id}>
                  <button 
                    onClick={() => onSelectReport(item.content)}
                    className="w-full text-left p-5 bg-white hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-slate-800 text-lg truncate pr-3 group-hover:text-blue-700 transition-colors">{item.title}</p>
                      {item.model && (
                          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 font-bold px-2.5 py-1 rounded-full flex-shrink-0 uppercase tracking-wide">
                              { (models.find(m => m.id === item.model)?.name.match(/\(([^)]+)\)/)?.[1]) || 'AI' }
                          </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 group-hover:text-blue-400">{item.date}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>

        {history.length > 0 && (
            <footer className="p-6 border-t border-slate-100 bg-white">
                <button
                    onClick={handleClearHistory}
                    className="w-full bg-slate-50 text-slate-500 font-bold py-3.5 px-5 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors border border-slate-200 hover:border-red-200 text-base"
                >
                    清空历史记录
                </button>
            </footer>
        )}
      </div>
    </div>
  );
};