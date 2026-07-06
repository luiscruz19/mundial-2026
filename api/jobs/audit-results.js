import cron from 'node-cron';
import Match from '../models/Match.js';
import { resolveBracketAfterMatch } from '../services/etl/bracket.js';
import { notifyMatchEvent } from '../services/notification/notify-event.js';

const KO_STAGES = ['round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final'];

/**
 * Auditoría de consistencia de resultados. Detecta (y auto-repara lo que es seguro) los
 * síntomas típicos de datos malos del proveedor, SIN depender de una fuente externa:
 *
 *  1) Cruce de eliminatoria finalizado EN EMPATE y SIN penales → no hay ganador
 *     determinable (el proveedor cargó el empate pero no la definición). Es exactamente
 *     lo que dejó "sin armar" un octavo. Se marca y se notifica para revisión manual
 *     contra la fuente oficial (no se puede adivinar quién ganó la tanda).
 *
 *  2) Propagación faltante: un cruce finalizado con ganador claro cuyo ganador no llegó
 *     al partido siguiente (el dependiente sigue con placeholder "W:<slot>"). Se AUTO-REPARA
 *     re-ejecutando la resolución del cuadro (idempotente).
 *
 * No detecta un marcador "plausible pero equivocado" (mismo ganador, distinto resultado):
 * eso requiere contrastar contra una 2ª fuente. Cubre el caso que rompe el cuadro.
 *
 * @returns {{ flagged: Array, healed: number }}
 */
export async function runAuditResults() {
    const koFinished = await Match.findAll({ where: { stage: KO_STAGES, status: 'finished' } });

    // 1) Empates de eliminatoria sin penales (ganador indeterminable).
    const flagged = [];
    for (const m of koFinished) {
        if (m.home_score != null && m.home_score === m.away_score
            && (m.home_penalties == null || m.away_penalties == null)) {
            flagged.push({ id: m.id, slot: m.bracket_slot, score: `${m.home_score}-${m.away_score}` });
        }
    }

    // 2) Auto-reparar propagaciones faltantes (idempotente: solo llena placeholders "W:slot").
    let healed = 0;
    for (const m of koFinished) {
        const updated = await resolveBracketAfterMatch(m);
        healed += updated.length;
    }

    if (flagged.length > 0) {
        console.warn(`[audit-results] ${flagged.length} cruce(s) de eliminación finalizados sin ganador determinable (empate sin penales): ${flagged.map(f => `${f.slot} ${f.score}`).join(', ')}`);
        try {
            const m = await Match.findByPk(flagged[0].id);
            await notifyMatchEvent(m, 'data_alert', {
                title: 'Revisar resultado de eliminación',
                body: `${flagged.length} cruce(s) finalizados sin definición cargada (empate sin penales). Revisá contra la fuente oficial.`,
                dedupeSuffix: `audit-${flagged.map(f => f.slot).join('-')}`,
            });
        } catch { /* aviso best-effort */ }
    }
    if (healed > 0) console.info(`[audit-results] propagaciones del cuadro reparadas: ${healed}`);

    return { flagged, healed };
}

export default function scheduleAuditResults() {
    // Cada hora (barato: lee la tabla y re-resuelve el cuadro, todo idempotente).
    cron.schedule('30 * * * *', () => {
        runAuditResults().catch(e => console.error('[audit-results]', e.message));
    });
}
