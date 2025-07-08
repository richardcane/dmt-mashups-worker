export interface Env {
	ATTENDANCE_KV: KVNamespace;
	DISCORD_WEBHOOK_URL: string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'GET') {
			return new Response('{}', {
				headers: { 'Content-Type': 'application/json' },
			});
		}
		return new Response('Method not allowed', { status: 405 });
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const cronTime = event.cron; // e.g. "0 17 * * 4" or "0 17 * * 0"

		const isThursdayTrigger = cronTime === '0 17 * * 4';
		const isSundayTrigger = cronTime === '0 17 * * 0';

		if (!isThursdayTrigger && !isSundayTrigger) return;

		const mashupDay = isThursdayTrigger ? 'Monday' : 'Thursday';
		const threadKey = `attendance_${mashupDay.toLowerCase()}`;
		const webhookURL = env.DISCORD_WEBHOOK_URL; // Replace with yours

		// Clear old attendance data
		await env.ATTENDANCE_KV.delete(threadKey);

		const payload = {
			thread_name: `${mashupDay} Mashup`,
			content: 'Click the button below to mark your attendance!',
			embeds: [
				{
					title: `${mashupDay} Mashup Attendance`,
					description: 'No attendees yet.',
					color: 5814783,
				},
			],
			components: [
				{
					type: 1,
					components: [
						{
							type: 2,
							label: "I'm Attending ✅",
							style: 1,
							custom_id: `attend_${mashupDay.toLowerCase()}`,
						},
					],
				},
			],
		};

		await fetch(webhookURL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
	},
};
