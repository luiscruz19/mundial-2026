import scheduleRefreshFifaRanking, { runRefreshFifaRanking } from './refresh-fifa-ranking.js';
import schedulePollFixtures, { runPollFixtures } from './poll-fixtures.js';
import scheduleSendScheduledPush, { runSendScheduledPush } from './send-scheduled-push.js';
import scheduleLivePoll, { runLivePoll } from './live-poll.js';
import scheduleRescheduleNotifications, { runRescheduleNotifications } from './reschedule-notifications.js';

// Permite apagar los jobs (p.ej. en tests / seed) con ENABLE_JOBS=false.
const ENABLE_JOBS = process.env.ENABLE_JOBS !== 'false';

if (ENABLE_JOBS) {
    scheduleRefreshFifaRanking();
    schedulePollFixtures();
    scheduleSendScheduledPush();
    scheduleLivePoll();
    scheduleRescheduleNotifications();
    console.info('Jobs programados: ranking FIFA, sondeo de fixture, push programadas, sondeo en vivo, reprogramación');
}

/**
 * Registro de jobs ejecutables manualmente (endpoint admin / trigger).
 */
export const JOB_RUNNERS = {
    'refresh-fifa-ranking': runRefreshFifaRanking,
    'poll-fixtures': runPollFixtures,
    'send-scheduled-push': runSendScheduledPush,
    'live-poll': runLivePoll,
    'reschedule-notifications': runRescheduleNotifications,
};
