import { Env } from './index';

const API_BASE = 'https://discord.com/api/v10';

export async function createMashupPost(mashupDay: string, env: Env): Promise<void> {
	const kvKey = `attendance_${mashupDay.toLowerCase()}`;
	const threadId = mashupDay === 'Monday' ? env.MONDAY_THREAD_ID : env.THURSDAY_THREAD_ID;

	// Clear attendance state
	await env.ATTENDANCE_KV.delete(kvKey);

	// Delete all messages in the thread
	await deleteAllMessages(threadId, env);

	// Post new attendance embed
	const payload = {
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

	await fetch(`${API_BASE}/channels/${threadId}/messages`, {
		method: 'POST',
		headers: {
			Authorization: env.DISCORD_BOT_TOKEN,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	});
}

async function deleteAllMessages(threadId: string, env: Env): Promise<void> {
	let before: string | undefined = undefined;
	let keepGoing = true;

	while (keepGoing) {
		const url = new URL(`${API_BASE}/channels/${threadId}/messages`);
		url.searchParams.set('limit', '50');
		if (before) url.searchParams.set('before', before);

		const res = await fetch(url.toString(), {
			headers: {
				Authorization: env.DISCORD_BOT_TOKEN,
			},
		});

		const messages: { id: string; pinned: boolean }[] = await res.json();
		if (!messages || messages.length === 0) break;

		for (const msg of messages) {
			if (!msg.pinned) {
				await fetch(`${API_BASE}/channels/${threadId}/messages/${msg.id}`, {
					method: 'DELETE',
					headers: {
						Authorization: env.DISCORD_BOT_TOKEN,
					},
				});

				// Respect rate limit: 5 deletes/sec per channel
				await new Promise((res) => setTimeout(res, 200));
			}
		}

		before = messages[messages.length - 1].id;
		keepGoing = messages.length === 50;
	}
}
