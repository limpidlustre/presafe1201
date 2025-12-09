import React, { useCallback, useState, useEffect } from 'react';

interface FileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviews, setFilePreviews] = useState<{name: string, type: string, url?: string}[]>([]);

  useEffect(() => {
    const newPreviews = files.map(file => ({
      name: file.name,
      type: file.type,
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }));
    setFilePreviews(newPreviews);

    return () => {
      newPreviews.forEach(p => p.url && URL.revokeObjectURL(p.url));
    };
  }, [files]);

  const handleFiles = useCallback((incomingFiles: FileList | null) => {
    if (incomingFiles) {
      const newFiles = Array.from(incomingFiles);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [setFiles]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string, name: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf') || name.endsWith('.pdf')) return '📕';
    if (type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return '📝';
    if (type.includes('spreadsheet') || type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx')) return '📊';
    return '📄';
  };

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden group transition-all">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-3 text-xl">
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          文件上传区
        </h3>
        <p className="text-sm text-slate-500 font-medium">支持图片、PDF、Word、Excel</p>
      </div>

      {/* List Area - Light Themed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-[300px] bg-white">
        {files.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-5">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200">
                 <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              </div>
              <span className="text-lg font-medium">暂无文件</span>
           </div>
        ) : (
          filePreviews.map((file, idx) => (
            <div key={idx} className="group/item relative flex items-center gap-4 p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all shadow-sm">
               <div className="w-14 h-14 flex-shrink-0 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm">
                  {file.url ? (
                    <img src={file.url} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{getFileIcon(file.type, file.name)}</span>
                  )}
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-base font-bold text-slate-700 truncate mb-1" title={file.name}>{file.name}</p>
                 <p className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold">{file.name.split('.').pop()}</p>
               </div>
               <button 
                 onClick={() => removeFile(idx)}
                 className="opacity-0 group-hover/item:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all"
               >
                 <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
               </button>
            </div>
          ))
        )}
      </div>

      {/* Drop Zone */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/30">
        <label
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
            isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 hover:border-blue-400 hover:bg-white'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input type="file" multiple className="hidden" onChange={handleFileChange} />
          <svg className="w-10 h-10 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4H7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V3m0 8l-3-3m3 3l3-3" /></svg>
          <span className="text-lg font-bold text-blue-600 tracking-wide">点击或拖拽上传</span>
        </label>
      </div>
    </div>
  );
};