
import React, { useRef, useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import pako from 'pako';

interface ResultDisplayProps {
  result: string;
}

// Helper to parse a markdown table row into cells
const parseTableRow = (row: string): string[] => {
  if (!row.startsWith('|') || !row.endsWith('|')) return [];
  return row.split('|').map(s => s.trim()).slice(1, -1);
};

// Helper to analyze safety status from the report
const analyzeSafetyStatus = (fullText: string) => {
  const lines = fullText.split('\n');
  // Look for the "Comprehensive Conclusion" or "Final Judgment" row.
  const conclusionRow = lines.find(line => 
    line.includes('综合结论') || 
    line.includes('最终判定') || 
    line.includes('综合检测结论')
  );

  if (!conclusionRow) return null;

  if (conclusionRow.includes('不合格') || conclusionRow.includes('阳性')) {
    return {
      status: 'danger',
      title: '检测不合格',
      message: '分析显示该产品存在安全风险，建议立即下架封存，并追溯原材料来源。',
      colorClass: 'bg-red-50 text-red-800 border-red-200',
      iconColor: 'text-red-500'
    };
  }
  if (conclusionRow.includes('待复检')) {
     return {
      status: 'warning',
      title: '建议复检',
      message: '分析发现部分指标存疑，建议进行进一步专业检测或复核。',
      colorClass: 'bg-amber-50 text-amber-800 border-amber-200',
      iconColor: 'text-amber-500'
    };
  }
  if (conclusionRow.includes('合格')) {
     return {
      status: 'success',
      title: '检测合格',
      message: '基于当前信息分析，该产品各项指标符合安全标准，允许正常销售。',
      colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconColor: 'text-emerald-500'
    };
  }
  
  return null;
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownloadPdf = () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    html2canvas(reportRef.current, { 
      scale: 2, 
      useCORS: true, 
      backgroundColor: '#ffffff'
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ['px_scaling'],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('AI-analysis-report.pdf');
    }).finally(() => {
        setIsDownloading(false);
    });
  };

  const handleShareLink = async () => {
    try {
      // pako.deflate returns Uint8Array, we need to convert it to binary string for btoa
      const compressed = pako.deflate(result);
      const binaryString = Array.from(compressed, (byte: number) => String.fromCharCode(byte)).join('');
      const base64 = btoa(binaryString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const url = `${window.location.origin}${window.location.pathname}?report=${base64}`;
      await navigator.clipboard.writeText(url);
      alert('分享链接已复制到剪贴板！');
    } catch (e) {
      console.error("Failed to create share link", e);
      alert('复制链接失败，请稍后重试。');
    }
  };

  const safetyStatus = useMemo(() => analyzeSafetyStatus(result), [result]);
  
  const lines = result.trim().split('\n');
  let titleComponent = null;
  const tableLines: string[] = [];

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('#')) {
      titleComponent = <h1 key="title" className="text-2xl sm:text-3xl font-bold text-slate-900 text-center tracking-tight mb-2">{trimmedLine.replace(/#/g, '').trim()}</h1>;
    } else if (trimmedLine.includes('|')) {
      tableLines.push(trimmedLine);
    }
  });
  
  const headerRowIndex = tableLines.findIndex(line => !line.includes('---') && line.includes('|'));
  const separatorRowIndex = tableLines.findIndex(line => line.includes('---'));

  const isTable = headerRowIndex !== -1 && separatorRowIndex !== -1 && separatorRowIndex > headerRowIndex;
  
  let tableContent = null;

  if (isTable) {
    const headerContent = parseTableRow(tableLines[headerRowIndex]);
    const bodyRowsRaw = tableLines.slice(separatorRowIndex + 1);
    
    // Columns: [Module, Category, Item, Standard, Actual, Result, Note]
    // After parsing: indices 0-6.
    // Center Align: Standard (3), Actual (4), Result (5).
    // Note: When mapping inside groupedRows, the first column (Module) is extracted.
    // So inside `row.map`, indices shift by -1 compared to full header.
    // Full Header: Mod(0), Cat(1), Item(2), Std(3), Act(4), Res(5), Note(6)
    // Row Cells:   Cat(0), Item(1), Std(2), Act(3), Res(4), Note(5)
    
    // We want to center align: Std, Act, Res.
    // In Full Header indices: 3, 4, 5.
    // In Row Cell indices: 2, 3, 4.

    const groupedRows: { category: string; rows: string[][] }[] = [];
    let currentGroup: { category: string; rows: string[][] } | null = null;

    bodyRowsRaw.forEach(rowStr => {
      const cells = parseTableRow(rowStr);
      if (cells.length === 0) return;

      const categoryRaw = cells[0]; // The "Module" column
      const category = categoryRaw.replace(/\*\*/g, '').trim();

      if (category && (!currentGroup || category !== currentGroup.category)) {
        if (currentGroup) groupedRows.push(currentGroup);
        currentGroup = { category: category, rows: [cells.slice(1)] };
      } else {
        if (currentGroup) currentGroup.rows.push(cells.slice(1));
      }
    });
    if (currentGroup) groupedRows.push(currentGroup);

    tableContent = (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-xs sm:text-sm">
            <thead className="bg-slate-100">
                <tr>
                {headerContent.map((header, i) => (
                    <th key={i} scope="col" className={`px-2 sm:px-4 py-3 font-bold text-slate-700 uppercase tracking-wider border-b border-slate-300 whitespace-nowrap ${i===0 ? 'pl-4 sm:pl-6 text-left' : 'text-center'}`}>
                    {header}
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
                {groupedRows.map((group, groupIndex) => (
                <React.Fragment key={groupIndex}>
                    {group.rows.map((row, rowIndex) => (
                    <tr key={`${groupIndex}-${rowIndex}`} className="hover:bg-slate-50 transition-colors">
                        {rowIndex === 0 && (
                        <td 
                            rowSpan={group.rows.length} 
                            className="px-2 sm:px-4 py-3 align-top font-semibold text-slate-800 border-r border-slate-100 bg-slate-50/50 w-24 sm:w-28 pl-4 sm:pl-6 text-xs sm:text-sm"
                        >
                            {group.category}
                        </td>
                        )}
                        {row.map((cell, cellIndex) => {
                            let cellContent: React.ReactNode = cell;
                            const isStatusCell = cell.includes('合格') || cell.includes('复检') || cell.includes('检出');
                            
                            if (cell.includes('不合格') || (isStatusCell && (cell.includes('阳性') || cell.includes('检出') && !cell.includes('未检出') && !cell.includes('不得检出')))) {
                                cellContent = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">不合格</span>;
                                if (cell.length > 5 && !cell.includes('阳性')) { 
                                   cellContent = <span className="text-red-700 font-bold">{cell}</span>;
                                }
                            } else if (cell.includes('待复检')) {
                                cellContent = <span className="text-amber-600 font-bold">{cell}</span>;
                            } else if (cell.includes('合格') || (isStatusCell && (cell.includes('阴性') || cell.includes('未检出')))) {
                                cellContent = <span className="text-emerald-600 font-bold">{cell}</span>;
                            } else if (cell.includes('有效') || cell.includes('AI核验通过')) {
                                 cellContent = <span className="text-emerald-600">{cell}</span>;
                            }
                            
                            // Alignments based on row cell index (after module removal)
                            // Cat(0), Item(1), Std(2), Act(3), Res(4), Note(5)
                            // We center Std(2), Act(3), Res(4)
                            const isCentered = [2, 3, 4].includes(cellIndex);
                            const alignClass = isCentered ? 'text-center' : 'text-left';

                            return (
                                <td key={cellIndex} className={`px-2 sm:px-4 py-3 text-slate-600 leading-relaxed break-words max-w-[200px] ${alignClass}`}>
                                {cellContent}
                                </td>
                            )
                        })}
                    </tr>
                    ))}
                </React.Fragment>
                ))}
            </tbody>
            </table>
        </div>
    );
  } else {
      tableContent = (
         <div className="prose prose-slate max-w-none">
             {result.split('\n').map((line, i) => <p key={i}>{line}</p>)}
         </div>
      );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Action Bar */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-bold text-slate-700">分析报告概览</h3>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleDownloadPdf} 
            disabled={isDownloading} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 hover:text-cyan-700 hover:border-cyan-300 transition-all text-sm shadow-sm"
          >
            {isDownloading ? (
               <span className="animate-pulse">生成中...</span>
            ) : (
                <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                下载 PDF
                </>
            )}
          </button>
          <button 
            onClick={handleShareLink} 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-cyan-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-cyan-700 transition-all text-sm shadow-sm hover:shadow-md"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
             </svg>
             分享报告
          </button>
        </div>
      </div>

      <div ref={reportRef} className="p-4 sm:p-8 bg-white min-h-[600px]">
        
        {/* Safety Status Banner */}
        {safetyStatus && (
            <div className={`mb-8 p-4 rounded-xl border ${safetyStatus.colorClass} flex items-start gap-4`}>
                <div className={`mt-1 p-2 bg-white rounded-full shadow-sm ${safetyStatus.iconColor} flex-shrink-0`}>
                    {safetyStatus.status === 'danger' && (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    )}
                     {safetyStatus.status === 'warning' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                     {safetyStatus.status === 'success' && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>
                <div>
                    <h4 className="text-lg font-bold">{safetyStatus.title}</h4>
                    <p className="text-sm mt-1 opacity-90 leading-relaxed">{safetyStatus.message}</p>
                </div>
            </div>
        )}

        <div className="mb-8 border-b pb-4">
            {titleComponent}
            <div className="mt-4 flex flex-wrap gap-4 text-xs sm:text-sm text-slate-500 justify-center">
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    生成日期: {new Date().toLocaleDateString('zh-CN')}
                </span>
                <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    AI 分析模型
                </span>
            </div>
        </div>

        {tableContent}

        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
            <span>Powered by Gemini 2.5</span>
            <span>仅供参考，不作为法律依据</span>
        </div>
      </div>
    </div>
  );
};
