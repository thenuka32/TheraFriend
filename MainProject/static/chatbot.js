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
        .then(res => res.json())
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
    .then(res => res.json())
    .then(data => appendMessage('bot', data.response || data.error))
    .catch(err => {
        console.error(err);
        appendMessage('bot', 'Sorry — something went wrong on my side.');
    });
}

document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') sendMessage();
});
document.getElementById('sendButton').addEventListener('click', sendMessage);

//Media Recorder API setup
const record = document.querySelector(".record");
const output = document.querySelector(".output");

if (navigator.mediaDevices.getUserMedia) {
    
    let onMediaSetupSuccess = function (stream) {
        const mediaRecorder = new MediaRecorder(stream);
        let chunks = [];

        record.onclick = function() {
            if (mediaRecorder.state == "recording") {
                mediaRecorder.stop();
                record.classList.remove("btn-danger");
                record.classList.add("btn-primary");
            } else {
                mediaRecorder.start();
                record.classList.remove("btn-primary");
                record.classList.add("btn-danger");
            }
        }

        mediaRecorder.ondataavailable = function (e) {
            chunks.push(e.data);
        }

        mediaRecorder.onstop = function () {
            let blob = new Blob(chunks, {type: "audio/webm"});
            chunks = [];

            let formData = new FormData();
            formData.append("audio", blob);

            fetch("/transcribe", {
                method: "POST",
                body: formData
            }).then((response) => response.json())
            .then((data) => {
                output.innerHTML = data.output;
            })
        }
    }
 
    let onMediaSetupFailure = function(err) {
        alert(err);
    }   

    navigator.mediaDevices.getUserMedia({ audio: true}).then(onMediaSetupSuccess, onMediaSetupFailure);

} else {
    alert("getUserMedia is not supported in your browser!")
}