import { verifyKey } from 'discord-interactions';
import { createMashupPost } from './mashup';

export interface Env {
	ATTENDANCE_KV: KVNamespace;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_BOT_TOKEN: string;
	MONDAY_THREAD_ID: string;
	THURSDAY_THREAD_ID: string;
}

const API_BASE = 'https://discord.com/api/v10';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method === 'GET') {
			// Manual test path
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
		}

		if (request.method === 'POST') {
			// Discord interaction handler
			const signature = request.headers.get('x-signature-ed25519');
			const timestamp = request.headers.get('x-signature-timestamp');
			const body = await request.text();

			const isValid = verifyKey(body, signature!, timestamp!, env.DISCORD_PUBLIC_KEY);
			if (!isValid) {
				return new Response('Invalid request signature', { status: 401 });
			}

			const interaction = JSON.parse(body);

			// Discord ping
			if (interaction.type === 1) {
				return new Response(JSON.stringify({ type: 1 }), {
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Button interaction
			if (interaction.type === 3) {
				const customId: string = interaction.data.custom_id;
				const mashupDay = customId.replace('attend_', '');
				const kvKey = `attendance_${mashupDay}`;

				const userId = interaction.member.user.id;
				const display = `<@${userId}>`;

				const raw = await env.ATTENDANCE_KV.get(kvKey);
				const attendees: string[] = raw ? JSON.parse(raw) : [];

				if (!attendees.includes(display)) {
					attendees.push(display);
					await env.ATTENDANCE_KV.put(kvKey, JSON.stringify(attendees));
				}

				// Edit the message
				const embed = {
					title: `${capitalize(mashupDay)} Mashup Attendance`,
					description: attendees.join('\n'),
					color: 5814783,
				};

				await fetch(`${API_BASE}/channels/${interaction.channel.id}/messages/${interaction.message.id}`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ embeds: [embed] }),
				});

				// Respond to interaction (no visible reply)
				return new Response(JSON.stringify({ type: 6 }), {
					headers: { 'Content-Type': 'application/json' },
				});
			}

			return new Response('Unhandled interaction', { status: 400 });
		}

		return new Response('Method not allowed', { status: 405 });
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

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}
