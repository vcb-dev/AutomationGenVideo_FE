'use client';

import React from 'react';
import { useTaskStore } from '@/store/taskStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, ChevronUp, ChevronDown, X } from 'lucide-react';
import { socialApi } from '@/lib/api/social';
import { pollRegistry } from '@/lib/polling-registry';
import { useSocialLang } from '@/contexts/SocialLanguageContext';

export const BackgroundTaskManager = () => {
  const { t } = useSocialLang();
  const { tasks, removeTask, updateTask } = useTaskStore();
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Always read latest translations in effects/intervals without restarting them
  const tRef = React.useRef(t);
  tRef.current = t;

  React.useEffect(() => {
    const completedTasks = tasks.filter(
      t => (t.status === 'success' || t.status === 'error') && !scheduledRemovalRef.current.has(t.id),
    );
    if (completedTasks.length === 0) return;

    const timers = completedTasks.map(task => {
      scheduledRemovalRef.current.add(task.id);
      return setTimeout(() => {
        scheduledRemovalRef.current.delete(task.id);
        removeTask(task.id);
      }, 10000);
    });

    return () => timers.forEach(t => clearTimeout(t));
  }, [tasks, removeTask]);

  const scheduledRemovalRef = React.useRef<Set<string>>(new Set());

  const tasksRef = React.useRef(tasks);
  tasksRef.current = tasks;
  const hasActivePosts = tasks.some(t => t.type === 'post' && (t.status === 'pending' || t.status === 'processing' || t.status === 'uploading'));

  React.useEffect(() => {
    if (!hasActivePosts) return;

    const poll = async () => {
      const activePosts = tasksRef.current.filter(t => t.type === 'post' && (t.status === 'pending' || t.status === 'processing' || t.status === 'uploading'));
      if (activePosts.length === 0) return;

      const jobIds = activePosts
        .map(t => t.id.replace('post-', ''))
        .filter(id => !pollRegistry.isActive(id));
      if (jobIds.length === 0) return;

      try {
        const { jobs } = await socialApi.queue.pollStatus(jobIds);

        jobs.forEach(job => {
          const taskId = `post-${job.id}`;
          const isDone = job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED';

          if (isDone) {
            const isSuccess = job.status === 'COMPLETED';
            updateTask(taskId, {
              status: isSuccess ? 'success' : 'error',
              progress: 100,
              message: isSuccess
                ? tRef.current.done
                : (job.error_msg || (job.status === 'CANCELLED' ? tRef.current.cancelled : tRef.current.failed)),
            });
          } else {
            const progress = job.queuePosition === null ? 80 : 20;
            const queueMsg = job.queuePosition === null
              ? tRef.current.sendingToSocial
              : tRef.current.queuePos(job.queuePosition, job.queueTotal ?? null);
            updateTask(taskId, { status: 'processing', progress, message: queueMsg });
          }
        });
      } catch (err) {
        console.error('[BackgroundTask] Poll error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [hasActivePosts, updateTask]);

  if (tasks.length === 0) return null;

  const activeCount = tasks.filter(t => t.status === 'uploading' || t.status === 'processing' || t.status === 'pending').length;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-80">
      <AnimatePresence>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Header */}
          <div
            className="bg-slate-900 text-white p-3 flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
              {activeCount > 0 ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              )}
              <span className="text-sm font-medium">
                {activeCount > 0 ? t.processingTasks(activeCount) : t.allDone}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </div>
          </div>

          {/* Task List */}
          {isExpanded && (
            <div className="max-h-60 overflow-y-auto p-2 space-y-2 bg-slate-50">
              {tasks.map((task) => (
                <div key={task.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 truncate pr-6">
                      {task.name}
                    </span>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${task.progress}%` }}
                        className={`h-full ${
                          task.status === 'success' ? 'bg-green-500' :
                          task.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 w-8 text-right">
                      {Math.round(task.progress)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {task.status === 'uploading' && (
                      <span className="text-[10px] text-blue-500">{task.message || t.uploading}</span>
                    )}
                    {task.status === 'processing' && (
                      <span className="text-[10px] text-amber-500 truncate max-w-[200px]">
                        {task.message || t.processing}
                      </span>
                    )}
                    {task.status === 'pending' && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {task.message || t.waiting}
                      </span>
                    )}
                    {task.status === 'success' && <span className="text-[10px] text-green-600 font-medium">{t.done}</span>}
                    {task.status === 'error' && <span className="text-[10px] text-red-500">{t.failed}: {task.message || t.failed}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
