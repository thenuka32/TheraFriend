function appendMessage(sender, text) {
    const messages = document.getElementById('messages');
    const div = document.createElement('div');
    div.className = sender;
    div.textContent = (sender === 'user' ? 'You: ' : 'Bot: ') + text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}


function renderGoals(list) {
    const goalsList = document.getElementById('goalsList');
    goalsList.innerHTML = '';

    list.forEach((task, index) => {
        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.index = index;

        checkbox.addEventListener('change', updateProgress);

        const label = document.createElement('label');
        label.textContent = task;

        li.appendChild(checkbox);
        li.appendChild(label);
        goalsList.appendChild(li);
    });

    updateProgress();
}

function updateProgress() {
    const checkboxes = document.querySelectorAll('#goalsList input[type="checkbox"]');
    const total = checkboxes.length;
    const checked = [...checkboxes].filter(cb => cb.checked).length;
    const percent = total ? Math.round((checked / total) * 100) : 0;
    document.getElementById('goalProgress').value = percent;
    document.getElementById('progressLabel').innerText = `${percent}% Complete`;
}


function extractStepsFromBotResponse(text) {
    const steps = [];
    const lines = text.split(/\n|•|\*/); // Split by newline, bullet, asterisk
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const match = line.match(/^(\d+\.|-|\*|•)?\s*(.+)/);
        if (match) {
            const step = match[2].trim();
            if (
                step.length > 10 &&
                !step.toLowerCase().includes('?') &&
                !step.toLowerCase().includes('you can do it') &&
                !step.toLowerCase().includes('believe in yourself')
            ) {
                steps.push(step);
            }
        }
    }
    return steps;
}

function addStepsToGoals(steps) {
    if (!steps.length) return;
    fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: steps })
    }).then(() => refreshGoals());
}

function refreshGoals() {
    fetch('/tasks')
        .then(r => r.json())
        .then(renderGoals);
}

function clearList() {
    fetch('/tasks/clear', { method: 'POST' })
        .then(() => {
            appendMessage('bot', 'Goals cleared! Ready for a fresh start.');
            refreshGoals();
        });
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
    .then(r => r.json())
    .then(d => {
        appendMessage('bot', d.response || d.error);

        const steps = extractStepsFromBotResponse(d.response || '');
        addStepsToGoals(steps);
    })
    .catch(e => {
        console.error(e);
        appendMessage('bot', 'Sorry — something went wrong on my side.');
    });
}


document.getElementById('messageInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
});
document.getElementById('sendButton').addEventListener('click', sendMessage);
document.querySelector('.clear-button').addEventListener('click', clearList);


const record = document.querySelector(".record");
if (record && navigator.mediaDevices?.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        let chunks = [];

        record.onclick = function () {
            if (mediaRecorder.state === "recording") {
                mediaRecorder.stop();
                record.classList.remove("btn-danger");
                record.classList.add("btn-primary");
            } else {
                mediaRecorder.start();
                record.classList.remove("btn-primary");
                record.classList.add("btn-danger");
            }
        };

        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            chunks = [];
            const formData = new FormData();
            formData.append("audio", blob);

            fetch("/transcribe", {
                method: "POST",
                body: formData
            })
            .then(r => r.json())
            .then(d => {
                document.querySelector(".output").innerText = d.output;
            });
        };
    });
}

refreshGoals();
        
        let notes = {};
        let currentDate = '';

        // Set today's date on load
        document.addEventListener('DOMContentLoaded', function() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('noteDate').value = today;
            loadNoteForDate();
            displayAllNotes();
        });
        
        function loadNoteForDate() {
            currentDate = document.getElementById('noteDate').value;
            const noteText = document.getElementById('noteText');
           
            if (notes[currentDate]) {
                noteText.value = notes[currentDate];
            } else {
                noteText.value = '';
            }
        }
        
        function saveNote() {
            const noteText = document.getElementById('noteText').value;
           
            if (noteText.trim() === '') {
                if (notes[currentDate]) {
                    delete notes[currentDate];
                }
            } else {
                notes[currentDate] = noteText;
            }
           
            displayAllNotes();
        }
        
        function saveToFile() {
            // Check if there are any notes to save
            if (Object.keys(notes).length === 0) {
                alert('No notes to save!');
                return;
            }
            
            // Sort dates chronologically
            const sortedDates = Object.keys(notes).sort();
            
            // Create the text content
            let content = '';
            sortedDates.forEach(date => {
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                content += `${formattedDate}\n`;
                content += `${'='.repeat(formattedDate.length)}\n`;
                content += `${notes[date]}\n\n`;
            });
            
            // Create blob and download
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "initial_prompt.txt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
        
        function displayAllNotes() {
            const notesList = document.getElementById('notesList');
            notesList.innerHTML = '';
            const sortedDates = Object.keys(notes).sort().reverse();
           
            if (sortedDates.length === 0) {
                notesList.innerHTML = '<p>No notes yet. Select a date and start writing!</p>';
                return;
            }
            
            sortedDates.forEach(date => {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'note-item';
               
                const dateObj = new Date(date);
                const formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
               
                noteDiv.innerHTML = `
                    <div class="note-date">${formattedDate}</div>
                    <div class="note-content">${notes[date]}</div>
                    <button class="edit-btn" onclick="editNote('${date}')">Edit</button>
                    <button class="delete-btn" onclick="deleteNote('${date}')">Delete</button>
                `;
               
                notesList.appendChild(noteDiv);
            });
        }
        
        function editNote(date) {
            document.getElementById('noteDate').value = date;
            loadNoteForDate();
        }
        
        function deleteNote(date) {
            if (confirm('Are you sure you want to delete this note?')) {
                delete notes[date];
                displayAllNotes();
               
                // Clear textarea if we're currently viewing the deleted note
                if (currentDate === date) {
                    document.getElementById('noteText').value = '';
                }
            }
            
        }
        
        function submitPrompt() {
            const input = document.getElementById('promptInput').value.trim();
            const status = document.getElementById('promptStatus');
            if (!input) {
                status.textContent = "Please enter some text.";
                return;
            }
            fetch('/add_prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input })
            })
            .then(res => res.json())
            .then(data => {
                status.textContent = data.message;
                document.getElementById('promptInput').value = '';
            })
            .catch(() => {
                status.textContent = "Failed to add to prompt file.";
            });
        }