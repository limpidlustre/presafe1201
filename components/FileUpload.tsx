import React, { useCallback, useState, useEffect } from 'react';

interface FileUploadProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, setFiles }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!files?.length) {
      setPreviewUrls([]);
      return;
    }
    const newPreviewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(newPreviewUrls);

    return () => {
      newPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);


  const handleFiles = useCallback((incomingFiles: FileList | null) => {
    if (incomingFiles) {
      const newFiles = Array.from(incomingFiles).filter(file => 
        ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
      );
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, [setFiles]);

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };
  
  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 transition-colors ${isDragging ? 'text-cyan-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h10a4 4 0 014 4v5a4 4 0 01-4 4H7z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11V3m0 8l-3-3m3 3l3-3" />
    </svg>
  );

  return (
    <div className="flex-1 flex flex-col">
      <label
        htmlFor="file-upload"
        className={`flex-1 min-h-[160px] flex flex-col items-center justify-center p-6 text-center border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-cyan-500 bg-cyan-50/50 scale-[1.02]' 
            : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <UploadIcon />
        <p className="text-slate-700 font-bold text-sm">点击选择或拖拽图片</p>
        <p className="text-xs text-slate-400 mt-2">支持 PNG, JPG, WEBP</p>
      </label>
      <input
        id="file-upload"
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      {previewUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm">
              <img
                src={url}
                alt={files[index]?.name || ''}
                className="w-full h-24 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-start justify-end p-1">
                <button
                  onClick={() => removeFile(index)}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100"
                  aria-label="Remove file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};