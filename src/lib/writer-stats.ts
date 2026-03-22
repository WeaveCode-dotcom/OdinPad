import type { Novel } from '@/types/novel';
import { supabase } from '@/integrations/supabase/client';

export interface WriterStats {
  totalWords: number;
  averageDailyWords: number;
  projectsCompleted: number;
  totalProjects: number;
}

function getSceneWords(novel: Novel): number {
  return novel.acts.reduce(
    (actSum, act) => actSum + act.chapters.reduce(
      (chapterSum, chapter) => chapterSum + chapter.scenes.reduce((sceneSum, scene) => sceneSum + scene.wordCount, 0),
      0,
    ),
    0,
  );
}

export function computeWriterStats(novels: Novel[]): WriterStats {
  const totalWords = novels.reduce((sum, novel) => sum + Math.max(novel.wordCount, getSceneWords(novel)), 0);
  const projectsCompleted = novels.filter(novel => novel.status === 'complete').length;
  const totalProjects = novels.length;

  const firstCreated = novels
    .map(novel => Date.parse(novel.createdAt))
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b)[0];
  const activeDays = firstCreated ? Math.max(1, Math.ceil((Date.now() - firstCreated) / (1000 * 60 * 60 * 24))) : 1;

  return {
    totalWords,
    averageDailyWords: Math.round(totalWords / activeDays),
    projectsCompleted,
    totalProjects,
  };
}

export function exportStatsAsCsv(stats: WriterStats): void {
  const lines = [
    'metric,value',
    `total_words,${stats.totalWords}`,
    `average_daily_words,${stats.averageDailyWords}`,
    `projects_completed,${stats.projectsCompleted}`,
    `total_projects,${stats.totalProjects}`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'odinpad-writer-stats.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportStatsAsPdfLikePrint(stats: WriterStats): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=800,height=600');
  if (!popup) return;
  popup.document.write(`
    <html>
      <head><title>OdinPad Writer Stats</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h1>OdinPad Writer Stats</h1>
        <p>Total words: ${stats.totalWords.toLocaleString()}</p>
        <p>Average daily words: ${stats.averageDailyWords.toLocaleString()}</p>
        <p>Projects completed: ${stats.projectsCompleted}</p>
        <p>Total projects: ${stats.totalProjects}</p>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

export async function syncDailyStatsSnapshot(userId: string, novels: Novel[]): Promise<void> {
  const stats = computeWriterStats(novels);
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('user_stats_daily')
    .upsert(
      {
        user_id: userId,
        stat_date: today,
        words_written: stats.totalWords,
        project_count: stats.totalProjects,
        session_count: 1,
      },
      { onConflict: 'user_id,stat_date' },
    );
  if (error) {
    console.warn('OdinPad: failed to sync daily stats snapshot', error.message);
  }
}
