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
const record = document.getElementById('.record');
const output = document.querySelector('.output');

let mediaRecorder;
let chunks = [];
let stream;

async function initializeRecorder() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(e) {
            chunks.push(e.data);
        };

        mediaRecorder.onstop = function() {
            let blob = new Blob(chunks, { type: "audio/webm;" });
            chunks = [];

            let formData = new FormData();
            formData.append("audio", blob);

            fetch("/transcribe", {
                method: "POST",
                body: formData
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.transcript) {
                    output.textContent = data.transcript;
                } else if (data.error) {
                    output.textContent = "Transcription failed: " + data.error;
                } else {
                    output.textContent = "No transcript received.";
                }
            })
            .catch((err) => {
                output.textContent = "Transcription failed.";
                console.error(err);
            });
        };
        
        return true;
    } catch (error) {
        alert("Error accessing microphone: " + error.message);
        return false;
    }
}

if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    record.onclick = async function() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            record.classList.remove("btn-danger");
            record.classList.add("btn-primary");
            record.textContent = "Record";
            
            // Stop all tracks to release microphone
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        } else {
            // Initialize new recorder for each recording session
            const initialized = await initializeRecorder();
            if (initialized) {
                mediaRecorder.start();
                record.classList.remove("btn-primary");
                record.classList.add("btn-danger");
                record.textContent = "Stop";
            }
        }
    };
} else {
    alert("getUserMedia is not supported in your browser");
}
document.getElementById('sendButton').addEventListener('click', sendMessage);