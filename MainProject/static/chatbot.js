
function appendMessage(sender, text) {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = sender;
    div.textContent = (sender === 'user' ? 'You: ' : 'Bot: ') + text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

function showList() {
    fetch('/tasks')
        .then(r => r.json())
        .then(list => {
            const reply = list.length
                ? "Here’s what you’ve asked me to track:\n• " + list.join("\n• ")
                : "Your list is currently empty.";
            appendMessage('bot', reply);
        });
}

function clearList() {
    fetch('/tasks/clear', { method: 'POST' })
        .then(() => appendMessage('bot', 'I’ve cleared your list. Let’s start fresh!'));
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text  = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    input.value = '';

    const lower = text.toLowerCase();

    if (lower.includes('remind me to') || lower.includes('help me quit')) {
        fetch('/tasks', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ task: text })
        })
        .then(() => appendMessage('bot', 'Got it! I added that to your goal list.'));
        return;
    }

    if (lower.includes('show my list') || lower.includes('show my tasks')) {
        showList();
        return;
    }

    if (lower.includes('clear my goals') || lower.includes('clear my list')) {
        clearList();
        return;
    }

    fetch('/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ message: text })
    })
    .then(r => r.json())
    .then(d => appendMessage('bot', d.response || d.error))
    .catch(e => {
        console.error(e);
        appendMessage('bot', 'Sorry — something went wrong on my side.');
    });
}

document.getElementById('messageInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
});
document.getElementById('sendButton').addEventListener('click', sendMessage);
