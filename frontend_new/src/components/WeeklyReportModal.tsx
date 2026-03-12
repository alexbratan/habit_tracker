import React, { useState, useEffect } from 'react';
import { weeklyReportAPI, WeeklyReport, DailyStats } from '../api';
import { X, Calendar, Target, TrendingUp, CheckCircle, Circle, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeek?: string;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({ isOpen, onClose, selectedWeek }) => {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, selectedWeek]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const data = await weeklyReportAPI.getWeeklyReport(selectedWeek);
      setReport(data);
    } catch (error) {
      console.error('Error loading weekly report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionBgColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-100';
    if (percentage >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getWeeklyPerformanceColor = (daysAt100Percent: number, avgCompletion: number) => {
    // High performance: 5+ days at 100% OR avg >= 80%
    if (daysAt100Percent >= 5 || avgCompletion >= 80) {
      const label = daysAt100Percent === 7 ? 'Perfect Week' : 'High Performance';
      return {
        bg: 'from-emerald-500 to-green-600',
        cardBg: 'from-emerald-50 to-emerald-100',
        borderColor: 'border-emerald-200',
        text: 'text-emerald-700',
        subText: 'text-emerald-600',
        label
      };
    }
    // Medium performance: 3-4 days at 100% OR avg >= 50%
    if (daysAt100Percent >= 3 || avgCompletion >= 50) {
      return {
        bg: 'from-yellow-500 to-orange-500',
        cardBg: 'from-yellow-50 to-yellow-100',
        borderColor: 'border-yellow-200',
        text: 'text-yellow-700',
        subText: 'text-yellow-600',
        label: 'Medium Performance'
      };
    }
    // Low performance: Everything else
    return {
      bg: 'from-red-500 to-pink-500',
      cardBg: 'from-red-50 to-red-100',
      borderColor: 'border-red-200',
      text: 'text-red-700',
      subText: 'text-red-600',
      label: 'Low Performance'
    };
  };

  const getDayPerformanceLevel = (percentage: number) => {
    if (percentage >= 80) return 'high';
    if (percentage >= 50) return 'medium';
    return 'low';
  };

  const getPerformanceBreakdown = (dailyStats: DailyStats[]) => {
    const breakdown = {
      perfect: 0,    // 100% completion
      high: 0,       // 80-99% completion
      medium: 0,     // 50-79% completion
      low: 0         // 0-49% completion
    };

    dailyStats.forEach(day => {
      if (day.completionPercentage >= 100) {
        breakdown.perfect++;
      } else if (day.completionPercentage >= 80) {
        breakdown.high++;
      } else if (day.completionPercentage >= 50) {
        breakdown.medium++;
      } else {
        breakdown.low++;
      }
    });

    return breakdown;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${report ? getWeeklyPerformanceColor(report.daysAt100Percent, report.averageDailyCompletion).bg : 'from-indigo-500 to-purple-600'} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Weekly Report</h2>
                  <p className="text-white/90 text-sm">
                    {report ? `${report.weekStart} - ${report.weekEnd}` : 'Loading...'}
                  </p>
                  {report && (
                    <p className="text-white/80 text-xs mt-1 font-medium">
                      {getWeeklyPerformanceColor(report.daysAt100Percent, report.averageDailyCompletion).label}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-neutral-600">Loading report...</span>
              </div>
            ) : report ? (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  {(() => {
                    const performanceColors = getWeeklyPerformanceColor(report.daysAt100Percent, report.averageDailyCompletion);
                    return (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`bg-gradient-to-br ${performanceColors.cardBg} dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border ${performanceColors.borderColor} dark:border-blue-700`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`${performanceColors.subText} dark:text-blue-400 text-sm font-medium`}>Avg. Completion</p>
                            <p className={`text-3xl font-bold ${performanceColors.text} dark:text-blue-300 mt-1`}>
                              {report.averageDailyCompletion.toFixed(1)}%
                            </p>
                            <p className={`${performanceColors.subText} dark:text-blue-400 text-xs mt-1`}>
                              daily average
                            </p>
                          </div>
                          <div className="p-3 bg-blue-500/20 rounded-full">
                            <TrendingUp className={`w-8 h-8 ${performanceColors.subText} dark:text-blue-400`} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

                {/* Performance Breakdown */}
                {(() => {
                  const breakdown = getPerformanceBreakdown(report.dailyStats);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6"
                    >
                      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        Performance Breakdown
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                          className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700 text-center"
                        >
                          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                            {breakdown.perfect}
                          </div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            Perfect Days
                          </div>
                          <div className="text-xs text-emerald-500 dark:text-emerald-500 mt-1">
                            100% completion
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.35 }}
                          className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700 text-center"
                        >
                          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                            {breakdown.high}
                          </div>
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            High Days
                          </div>
                          <div className="text-xs text-blue-500 dark:text-blue-500 mt-1">
                            80-99% completion
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700 text-center"
                        >
                          <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                            {breakdown.medium}
                          </div>
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Medium Days
                          </div>
                          <div className="text-xs text-yellow-500 dark:text-yellow-500 mt-1">
                            50-79% completion
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.45 }}
                          className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-700 text-center"
                        >
                          <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                            {breakdown.low}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Low Days
                          </div>
                          <div className="text-xs text-red-500 dark:text-red-500 mt-1">
                            0-49% completion
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Daily Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6"
                >
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Daily Breakdown
                  </h3>
                  
                  <div className="space-y-3">
                    {report.dailyStats.map((day, index) => (
                      <motion.div
                        key={day.date}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                        className={`p-4 rounded-lg border ${getCompletionBgColor(day.completionPercentage)} border-opacity-50`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-neutral-800">
                              {day.is100PercentComplete ? (
                                <CheckCircle className={`w-5 h-5 ${getCompletionColor(day.completionPercentage)}`} />
                              ) : (
                                <Circle className={`w-5 h-5 ${getCompletionColor(day.completionPercentage)}`} />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-neutral-800 dark:text-neutral-200">
                                {WEEKDAYS[day.weekday]}
                              </p>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {day.date}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${getCompletionColor(day.completionPercentage)}`}>
                              {day.completionPercentage.toFixed(1)}%
                            </p>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                              {formatMinutes(day.totalActualMinutes)} / {formatMinutes(day.totalPlannedMinutes)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-white dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(day.completionPercentage, 100)}%` }}
                            transition={{ delay: 0.5 + index * 0.05, duration: 0.8 }}
                            className={`h-full rounded-full ${getProgressBarColor(day.completionPercentage)}`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-neutral-600 dark:text-neutral-400">No report data available</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
