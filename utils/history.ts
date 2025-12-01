import { Model } from '../constants';

export interface ReportHistoryItem {
  id: number;
  title: string;
  date: string;
  content: string;
  model: Model;
}

const HISTORY_KEY = 'mealSafetyAgentHistory';
const MAX_HISTORY_ITEMS = 20;

export const getHistory = (): ReportHistoryItem[] => {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error("Could not get history from localStorage", error);
    return [];
  }
};

export const addReportToHistory = (report: ReportHistoryItem): void => {
  try {
    const currentHistory = getHistory();
    const updatedHistory = [report, ...currentHistory];
    
    // Limit the number of history items
    if (updatedHistory.length > MAX_HISTORY_ITEMS) {
      updatedHistory.length = MAX_HISTORY_ITEMS;
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Could not add report to localStorage", error);
  }
};

export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Could not clear history from localStorage", error);
  }
};
