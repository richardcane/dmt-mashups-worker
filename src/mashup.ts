import { Env } from './index';

export async function createMashupPost(mashupDay: string, env: Env): Promise<void> {
	const threadKey = `attendance_${mashupDay.toLowerCase()}`;
	const webhookURL = env.DISCORD_WEBHOOK_URL;

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
}
