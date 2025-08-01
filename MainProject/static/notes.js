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
            const noteDate = document.getElementById('noteDate').value;

            fetch('/save_note', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: noteDate, note: noteText })
            })
            .then(res => res.json())
            .then(data => {
                // Optionally show a message
                displayAllNotes();
            });

            // Update local notes object for UI
            if (noteText.trim() === '') {
                if (notes[noteDate]) {
                    delete notes[noteDate];
                }
            } else {
                notes[noteDate] = noteText;
            }
            displayAllNotes();
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