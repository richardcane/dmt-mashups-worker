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
			Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
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
				Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
			},
		});

		if (!res.ok) {
			const errorText = await res.text();
			console.error(`[ERROR] Failed to fetch messages: ${res.status} ${errorText}`);
			throw new Error(`Failed to fetch messages: ${res.status}`);
		}

		const messages = await res.json();

		if (!Array.isArray(messages)) {
			console.error('[ERROR] Unexpected message payload:', messages);
			throw new Error('Expected messages to be an array');
		}

		if (messages.length === 0) break;

		for (const msg of messages) {
			if (!msg.pinned) {
				await fetch(`${API_BASE}/channels/${threadId}/messages/${msg.id}`, {
					method: 'DELETE',
					headers: {
						Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
					},
				});

				await new Promise((res) => setTimeout(res, 200));
			}
		}

		before = messages[messages.length - 1].id;
		keepGoing = messages.length === 50;
	}
}
