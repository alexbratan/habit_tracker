import React, { useState, useEffect } from 'react';
import { dailyProgressAPI, StreakResponse } from '../api';
import { Flame, Trophy, Crown, Star, Sprout, Moon, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakProps {
  className?: string;
}

export const Streak: React.FC<StreakProps> = ({ className = '' }) => {
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, []);

  const loadStreak = async () => {
    try {
      const data: StreakResponse = await dailyProgressAPI.getStreak();
      setCurrentStreak(data.current_streak);
      setBestStreak(data.best_streak);
    } catch (error) {
      console.error('Error loading streak:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentStreakColor = (streakValue: number) => {
    if (streakValue === 0) return 'text-neutral-600';
    if (streakValue >= 7) return 'text-emerald-600'; // Week+ streak
    if (streakValue >= 3) return 'text-blue-600'; // 3+ days
    return 'text-orange-600'; // 1-2 days
  };

  const getBestStreakColor = (bestValue: number) => {
    if (bestValue === 0) return 'text-neutral-500';
    if (bestValue >= 14) return 'text-purple-600'; // 2+ weeks
    if (bestValue >= 7) return 'text-emerald-600'; // Week+ streak
    if (bestValue >= 3) return 'text-blue-600'; // 3+ days
    return 'text-orange-600'; // 1-2 days
  };

  const getCurrentStreakEmoji = (streakValue: number) => {
    if (streakValue === 0) return <Moon className="w-6 h-6" />;
    if (streakValue >= 7) return <Flame className="w-6 h-6" />; // On fire!
    if (streakValue >= 3) return <Star className="w-6 h-6" />; // Good progress
    return <Sprout className="w-6 h-6" />; // Getting started
  };

  const getBestStreakEmoji = (bestValue: number) => {
    if (bestValue === 0) return <Trophy className="w-5 h-5" />;
    if (bestValue >= 14) return <Crown className="w-5 h-5" />; // Legendary
    if (bestValue >= 7) return <Award className="w-5 h-5" />; // Week+ streak
    if (bestValue >= 3) return <Star className="w-5 h-5" />; // Good progress
    return <Sprout className="w-5 h-5" />; // Getting started
  };

  const getCurrentStreakMessage = (streakValue: number) => {
    if (streakValue === 0) return 'No current streak';
    if (streakValue === 1) return '1 day streak!';
    return `${streakValue} days streak!`;
  };

  const getBestStreakMessage = (bestValue: number) => {
    if (bestValue === 0) return 'No best streak yet';
    return `Best: ${bestValue} days`;
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${className} card p-6`}
      >
        <div className="flex items-center justify-center h-24">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-3 animate-pulse" />
            <p className="text-neutral-600 font-medium text-sm">Loading streak...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${className} card p-6 space-y-6`}
    >
      {/* Current Streak */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden"
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${
          currentStreak >= 7 ? 'from-emerald-50 to-teal-50' :
          currentStreak >= 3 ? 'from-blue-50 to-indigo-50' :
          currentStreak >= 1 ? 'from-orange-50 to-yellow-50' :
          'from-neutral-50 to-gray-50'
        } rounded-2xl`} />
        
        <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{
                  scale: currentStreak >= 7 ? [1, 1.1, 1] : 1,
                  rotate: currentStreak >= 7 ? [0, 5, -5, 0] : 0
                }}
                transition={{
                  duration: 2,
                  repeat: currentStreak >= 7 ? Infinity : 0,
                  repeatDelay: 3
                }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  currentStreak >= 7 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                  currentStreak >= 3 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                  currentStreak >= 1 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                  'bg-gradient-to-r from-neutral-400 to-gray-500'
                } text-white shadow-lg`}
              >
                {getCurrentStreakEmoji(currentStreak)}
              </motion.div>
              
              <div>
                <motion.div
                  key={currentStreak}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-4xl font-bold ${getCurrentStreakColor(currentStreak)} mb-1`}
                >
                  {currentStreak}
                </motion.div>
                <div className={`text-sm font-medium ${getCurrentStreakColor(currentStreak)}`}>
                  {getCurrentStreakMessage(currentStreak)}
                </div>
              </div>
            </div>
            
            {currentStreak >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-1"
              >
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">On fire!</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Best Streak */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden"
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${
          bestStreak >= 14 ? 'from-purple-50 to-pink-50' :
          bestStreak >= 7 ? 'from-emerald-50 to-teal-50' :
          bestStreak >= 3 ? 'from-blue-50 to-indigo-50' :
          'from-neutral-50 to-gray-50'
        } rounded-2xl`} />
        
        <div className="relative bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                bestStreak >= 14 ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                bestStreak >= 7 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                bestStreak >= 3 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                'bg-gradient-to-r from-neutral-400 to-gray-500'
              } text-white shadow-md`}
              >
                {getBestStreakEmoji(bestStreak)}
              </div>
              
              <div>
                <motion.div
                  key={bestStreak}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-2xl font-bold ${getBestStreakColor(bestStreak)} mb-1`}
                >
                  {bestStreak}
                </motion.div>
                <div className={`text-xs font-medium ${getBestStreakColor(bestStreak)}`}>
                  {getBestStreakMessage(bestStreak)}
                </div>
              </div>
            </div>
            
            {bestStreak >= 14 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-1"
              >
                <Crown className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-purple-600 font-medium">Legendary!</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Motivational Message */}
      {currentStreak >= 7 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100"
        >
          <p className="text-emerald-800 font-medium text-sm">
            {currentStreak >= 14 ? "Incredible consistency! You're a habit master! 🎉" :
             currentStreak >= 7 ? "Amazing dedication! Keep the momentum going! 💪" :
             "Great job building your routine! 🌟"}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};
