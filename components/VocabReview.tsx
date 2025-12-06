import React, { useMemo, useState } from 'react';
import { BookOpen, RefreshCw, ChevronDown } from 'lucide-react';
import { LogsMap } from '../types';

interface VocabReviewProps {
    logs: LogsMap;
    year: number;
    month: number;
    daysInMonth: number;
}

const VocabReview = ({ logs, year, month, daysInMonth }: VocabReviewProps) => {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const monthlyVocabByWeek = useMemo(() => {
        const weeks: { start: number; end: number; words: { day: number; word: string; meaning: string }[] }[] = [
            { start: 1, end: 7, words: [] },
            { start: 8, end: 14, words: [] },
            { start: 15, end: 21, words: [] },
            { start: 22, end: daysInMonth, words: [] },
        ];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logs[dateStr];
            if (log && log.vocabDone) {
                const weekIndex = weeks.findIndex(w => day >= w.start && day <= w.end);
                if (weekIndex !== -1) {
                    if (log.vocab1Word?.trim()) weeks[weekIndex].words.push({ day, word: log.vocab1Word, meaning: log.vocab1Meaning });
                    if (log.vocab2Word?.trim()) weeks[weekIndex].words.push({ day, word: log.vocab2Word, meaning: log.vocab2Meaning });
                }
            }
        }
        return weeks;
      }, [logs, year, month, daysInMonth, refreshTrigger]);

      const handleRefresh = () => {
          setRefreshTrigger(prev => prev + 1);
      };

    return (
        <section className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
             <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                 <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                     <BookOpen size={20} />
                     Monthly Vocabulary Review
                 </h3>
                 <button onClick={handleRefresh} className="text-xs bg-sky-100 text-sky-700 px-3 py-1.5 rounded-full hover:bg-sky-200 transition font-medium flex items-center gap-1 shadow-sm">
                    <RefreshCw size={12} /> Update List
                 </button>
             </div>
             <div className="p-4 space-y-2">
                 {monthlyVocabByWeek.map((week, idx) => (
                     <details key={idx} className="group border border-indigo-100 rounded-lg bg-white open:bg-indigo-50/30 transition-colors">
                         <summary className="flex items-center justify-between p-3 font-medium cursor-pointer list-none text-indigo-800 hover:bg-indigo-50 rounded-lg">
                             <span>Week {idx + 1} (Days {week.start}-{week.end})</span>
                             <span className="flex items-center gap-2 text-sm text-indigo-400">
                                 {week.words.length} words <ChevronDown className="group-open:rotate-180 transition-transform" size={16}/>
                             </span>
                         </summary>
                         <div className="p-3 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                             {week.words.length === 0 ? <p className="text-sm text-gray-400 italic col-span-full text-center py-2">No words recorded yet.</p> : week.words.map((item, i) => (
                                 <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-100 text-sm shadow-sm">
                                     <div><span className="font-bold text-indigo-700">{item.word}</span>{item.meaning && <span className="text-gray-500 block text-xs">{item.meaning}</span>}</div>
                                     <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Day {item.day}</span>
                                 </div>
                             ))}
                         </div>
                     </details>
                 ))}
             </div>
         </section>
    );
};

export default VocabReview;
