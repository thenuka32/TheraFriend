document.addEventListener('DOMContentLoaded', function() {
    function appendMessage(sender, text) {
        const messages = document.getElementById('messages');
        const div = document.createElement('div');
        div.className = sender;
        div.textContent = (sender === 'user' ? 'You: ' : 'Bot: ') + text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    window.sendMessage = function() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text) return;
        appendMessage('user', text);
        input.value = '';
        fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        })
        .then(res => res.json())
        .then(data => {
            appendMessage('bot', data.response || data.error);
        });
    };

    document.getElementById('messageInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            window.sendMessage();
        }
    });
});