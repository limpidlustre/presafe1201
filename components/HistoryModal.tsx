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
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b">
          <h2 id="history-title" className="text-lg font-bold text-slate-800">分析历史记录</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800" aria-label="关闭">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-8">没有历史记录。</p>
          ) : (
            <ul className="space-y-2">
              {history.map(item => (
                <li key={item.id}>
                  <button 
                    onClick={() => onSelectReport(item.content)}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-cyan-50 rounded-md transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-slate-700 truncate pr-2">{item.title}</p>
                      {item.model && (
                          <span className="text-xs text-white bg-cyan-600 font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                              { (models.find(m => m.id === item.model)?.name.match(/\(([^)]+)\)/)?.[1]) || item.model }
                          </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.date}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>

        {history.length > 0 && (
            <footer className="p-4 border-t">
                <button
                    onClick={handleClearHistory}
                    className="w-full bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition-colors"
                >
                    清空历史记录
                </button>
            </footer>
        )}
      </div>
    </div>
  );
};
