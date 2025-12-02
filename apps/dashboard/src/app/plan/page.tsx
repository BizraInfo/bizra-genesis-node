'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Plus,
  CheckCircle,
  Circle,
  Clock,
  Target,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Brain,
  Zap
} from 'lucide-react';
import { api, Plan, PlanTask } from '@/lib/api';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PlanPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newTask, setNewTask] = useState('');
  
  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getDailyPlan(currentDate.toISOString().split('T')[0]);
      setPlan(data);
    } catch (err) {
      console.error('Failed to load plan:', err);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);
  
  useEffect(() => {
    loadPlan();
  }, [loadPlan]);
  
  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const data = await api.generateDailyPlan({
        date: currentDate.toISOString().split('T')[0],
        context: {
          day_of_week: daysOfWeek[currentDate.getDay()],
        },
      });
      setPlan(data);
    } catch (err) {
      console.error('Failed to generate plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const toggleTask = async (taskId: string, completed: boolean) => {
    if (!plan) return;
    
    const updatedTasks = plan.tasks.map(task =>
      task.id === taskId ? { ...task, completed } : task
    );
    
    setPlan({ ...plan, tasks: updatedTasks });
    
    // TODO: Call API to update task status
  };
  
  const addTask = async () => {
    if (!newTask.trim() || !plan) return;
    
    const task: PlanTask = {
      id: `task-${Date.now()}`,
      title: newTask.trim(),
      completed: false,
      priority: 'medium',
      category: 'general',
      time_estimate_minutes: 30,
      poi_points: 10,
    };
    
    setPlan({ ...plan, tasks: [...plan.tasks, task] });
    setNewTask('');
    
    // TODO: Call API to add task
  };
  
  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };
  
  const isToday = currentDate.toDateString() === new Date().toDateString();
  
  const completedTasks = plan?.tasks.filter(t => t.completed).length || 0;
  const totalTasks = plan?.tasks.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Generate week view dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - date.getDay() + i);
    return date;
  });
  
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-panel border-t-0 border-x-0 rounded-none sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center border border-orange-500/20">
                <Calendar className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Daily Plan</h1>
                <p className="text-xs text-white/40">AI-assisted task management</p>
              </div>
            </div>
            
            <button
              onClick={generatePlan}
              disabled={isGenerating}
              className="btn-sovereign text-sm flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Generate with AI
                </>
              )}
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Date Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-4 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateDay(-7)}
              title="Previous week"
              aria-label="Navigate to previous week"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <p className="text-lg font-semibold">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            
            <button
              onClick={() => navigateDay(7)}
              title="Next week"
              aria-label="Navigate to next week"
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          {/* Week View */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const isSelected = date.toDateString() === currentDate.toDateString();
              const isCurrentDay = date.toDateString() === new Date().toDateString();
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setCurrentDate(date)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    isSelected
                      ? 'bg-bizra-gold text-bizra-black'
                      : isCurrentDay
                      ? 'bg-bizra-gold/20 border border-bizra-gold/30'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <p className={`text-xs ${isSelected ? 'text-bizra-black/60' : 'text-white/40'}`}>
                    {daysOfWeek[date.getDay()]}
                  </p>
                  <p className="text-lg font-bold mt-1">{date.getDate()}</p>
                </button>
              );
            })}
          </div>
        </motion.div>
        
        {/* Progress Overview */}
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel-gold p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">
                  {isToday ? "Today's Progress" : currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h3>
                <p className="text-sm text-white/50 mt-1">
                  {completedTasks} of {totalTasks} tasks completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-bizra-gold">{progress.toFixed(0)}%</p>
              </div>
            </div>
            
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-bizra-gold-dark via-bizra-gold to-bizra-gold-light"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            
            {plan.focus_theme && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-bizra-gold" />
                  <span className="text-white/50">Focus Theme:</span>
                  <span className="text-white">{plan.focus_theme}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Tasks List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel"
        >
          {/* Add Task Input */}
          <div className="p-4 border-b border-white/10">
            <div className="flex gap-2">
              <label htmlFor="new-task-input" className="sr-only">New task</label>
              <input
                id="new-task-input"
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a new task..."
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-bizra-gold focus:outline-none text-sm"
              />
              <button
                onClick={addTask}
                disabled={!newTask.trim()}
                title="Add task"
                aria-label="Add new task"
                className="px-4 py-2 rounded-lg bg-bizra-gold text-bizra-black font-medium text-sm disabled:opacity-50 hover:bg-bizra-gold-light transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Tasks */}
          {isLoading ? (
            <div className="p-12 text-center text-white/40">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              Loading tasks...
            </div>
          ) : !plan || plan.tasks.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-white/50 mb-2">No tasks planned for this day</p>
              <button
                onClick={generatePlan}
                className="text-bizra-gold hover:text-bizra-gold-light text-sm flex items-center gap-2 mx-auto"
              >
                <Sparkles className="w-4 h-4" />
                Generate AI plan
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {plan.tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 flex items-start gap-3 hover:bg-white/5 transition-colors ${
                    task.completed ? 'opacity-60' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id, !task.completed)}
                    className="mt-0.5 flex-shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-white/30 hover:text-bizra-gold transition-colors" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.completed ? 'line-through text-white/50' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-white/40 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {task.estimated_minutes && (
                        <span className="text-xs text-white/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {task.estimated_minutes}m
                        </span>
                      )}
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          task.priority === 'high' ? 'badge-error' :
                          task.priority === 'medium' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                      {task.agent && (
                        <span className="text-xs text-bizra-gold flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {task.agent}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                      title="Edit task"
                      aria-label="Edit task"
                      className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      title="Delete task"
                      aria-label="Delete task"
                      className="p-1.5 rounded hover:bg-white/10 transition-colors text-white/30 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
        
        {/* AI Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-4 rounded-xl bg-bizra-gold/5 border border-bizra-gold/20"
        >
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-bizra-gold flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-bizra-gold">AI Planning Assistant</p>
              <p className="text-sm text-white/60 mt-1">
                The Execution Planner PAT can analyze your patterns and automatically 
                suggest optimal task scheduling. Enable AI planning to get personalized 
                recommendations based on your productivity history.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
