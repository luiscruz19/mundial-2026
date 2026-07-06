import scheduleRefreshFifaRanking, { runRefreshFifaRanking } from './refresh-fifa-ranking.js';
import scheduleRefreshElo, { runRefreshElo } from './refresh-elo.js';
import schedulePollFixtures, { runPollFixtures } from './poll-fixtures.js';
import scheduleSendScheduledPush, { runSendScheduledPush } from './send-scheduled-push.js';
import scheduleLivePoll, { runLivePoll } from './live-poll.js';
import scheduleRescheduleNotifications, { runRescheduleNotifications } from './reschedule-notifications.js';
import scheduleAuditResults, { runAuditResults } from './audit-results.js';

// Permite apagar los jobs (p.ej. en tests / seed) con ENABLE_JOBS=false.
const ENABLE_JOBS = process.env.ENABLE_JOBS !== 'false';

if (ENABLE_JOBS) {
    scheduleRefreshFifaRanking();
    scheduleRefreshElo();
    schedulePollFixtures();
    scheduleSendScheduledPush();
    scheduleLivePoll();
    scheduleRescheduleNotifications();
    scheduleAuditResults();
    console.info('Jobs programados: ranking FIFA, Elo, sondeo de fixture, push programadas, sondeo en vivo, reprogramación, auditoría de resultados');
}

/**
 * Registro de jobs ejecutables manualmente (endpoint admin / trigger).
 */
export const JOB_RUNNERS = {
    'refresh-fifa-ranking': runRefreshFifaRanking,
    'refresh-elo': runRefreshElo,
    'poll-fixtures': runPollFixtures,
    'send-scheduled-push': runSendScheduledPush,
    'live-poll': runLivePoll,
    'reschedule-notifications': runRescheduleNotifications,
    'audit-results': runAuditResults,
};
