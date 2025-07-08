import { createMashupPost } from './mashup';

export interface Env {
	ATTENDANCE_KV: KVNamespace;
	DISCORD_WEBHOOK_URL: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== 'GET') {
			return new Response('Method not allowed', { status: 405 });
		}

		const url = new URL(request.url);
		const mashupParam = url.searchParams.get('mashup');

		if (mashupParam !== 'Monday' && mashupParam !== 'Thursday') {
			return new Response('{}', {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		try {
			await createMashupPost(mashupParam, env);
			return new Response(JSON.stringify({ success: true, mashup: mashupParam }), {
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return new Response(JSON.stringify({ success: false, error: errorMessage }), {
				headers: { 'Content-Type': 'application/json' },
				status: 500,
			});
		}
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const cronTime = event.cron;

		const isThursdayTrigger = cronTime === '0 17 * * THU';
		const isSundayTrigger = cronTime === '0 17 * * SUN';

		if (!isThursdayTrigger && !isSundayTrigger) return;

		const mashupDay = isThursdayTrigger ? 'Thursday' : 'Monday';
		await createMashupPost(mashupDay, env);
	},
};
