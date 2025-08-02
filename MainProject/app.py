from flask import Flask, request, jsonify, render_template, session
from flask_session import Session
from dotenv import load_dotenv
from openai import OpenAI
import os, io


load_dotenv()


app = Flask(__name__, template_folder='templates')
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)
app.secret_key = 'supersecretkey'


client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


with open(os.path.join(os.path.dirname(__file__), 'topic_prompts', 'initial_prompt.txt'), encoding='utf-8') as f:
    SYSTEM_PROMPT = f.read().strip()



@app.route('/')
def chatbot_page():
    return render_template("chatBotpage.html")

@app.route('/chat', methods=['POST'])
def chat():
    user_msg = request.json.get('message', '').strip()
    if not user_msg:
        return jsonify({'error': 'No message'}), 400

    history = session.get('conversation', [])
    history.append({"role": "user", "content": user_msg})

    # Get notes from session
    notes = session.get('notes', {})
    notes_text = "\n".join([f"{date}: {note}" for date, note in notes.items()])
    notes_prompt = f"Here are the user's notes:\n{notes_text}\n" if notes_text else ""

    # Add notes to system prompt
    system_prompt = SYSTEM_PROMPT + "\n" + notes_prompt

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": system_prompt}] + history
        )
        bot_reply = response.choices[0].message.content.strip()
    except Exception as e:
        app.logger.error(f"Chat error: {e}")
        return jsonify({'error': 'Something went wrong while generating response.'})

    history.append({"role": "assistant", "content": bot_reply})
    session['conversation'] = history

    return jsonify({'response': bot_reply})

@app.route('/tasks', methods=['POST'])
def add_tasks():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No task data'}), 400

    new_tasks = data.get('tasks') or [data.get('task')]
    if not new_tasks or not isinstance(new_tasks, list):
        return jsonify({'error': 'Invalid task format'}), 400

    
    tasks = session.get('tasks', [])
    tasks.extend([task.strip() for task in new_tasks if task.strip()])
    session['tasks'] = tasks

    return jsonify({'status': 'added', 'tasks': tasks})

@app.route('/tasks', methods=['GET'])
def get_tasks():
    return jsonify(session.get('tasks', []))

@app.route('/tasks/clear', methods=['POST'])
def clear_tasks():
    session['tasks'] = []
    return jsonify({'status': 'cleared'})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    file = request.files.get('audio')
    if not file:
        return jsonify({'error': 'No audio file'}), 400

    buffer = io.BytesIO(file.read())
    buffer.name = "audio.webm"

    try:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=buffer
        )
        return jsonify({"output": transcript.text})
    except Exception as e:
        app.logger.error(f"Transcription error: {e}")
        return jsonify({"error": "Failed to transcribe audio."})


@app.route('/add_prompt', methods=['POST'])
def add_prompt():
    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'message': 'No text provided.'}), 400

    prompt_path = os.path.join(script_dir, 'topic_prompts', 'initial_prompt.txt')
    try:
        with open(prompt_path, 'a', encoding='utf-8') as f:
            f.write('\n' + text)
        return jsonify({'message': 'Text added to prompt file!'})
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/save_note', methods=['POST'])
def save_note():
    data = request.get_json()
    date = data.get('date')
    note = data.get('note', '').strip()
    if not date:
        return jsonify({'message': 'No date provided.'}), 400

    notes = session.get('notes', {})
    if note:
        notes[date] = note
    else:
        notes.pop(date, None)
    session['notes'] = notes
    return jsonify({'message': 'Note saved!', 'notes': notes})




if __name__ == "__main__":
    app.run(debug=True)