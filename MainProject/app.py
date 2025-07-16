from flask import Flask, request, jsonify, render_template, session
from flask_session import Session
from dotenv import load_dotenv
import os
from openai import OpenAI
import io
from pathlib import Path

# Load environment variables from .env
load_dotenv()


app = Flask(__name__, template_folder = 'templates')

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

app.secret_key = 'supersecretkey'

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

script_dir = os.path.dirname(os.path.abspath(__file__))
prompt_path = os.path.join(script_dir, 'topic_prompts', 'initial_prompt.txt')
with open(prompt_path, 'r', encoding='utf-8') as f:
    SYSTEM_PROMPT = f.read().strip()


@app.route('/')
def chatbot_page():
    return render_template('chatBotpage.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_msg = request.json.get('message', '')

    history = session.get('conversation', [])
    history.append({"role": "user", "content": user_msg})

    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as e:
        app.logger.error(e)
        reply = "Hmm, I’m having trouble responding right now — try again soon?"



    history.append({"role": "assistant", "content": reply})
    session['conversation'] = history
    return jsonify({'response': reply})

@app.route('/tasks', methods=['POST'])
def add_task():
    task = request.json.get('task', '').strip()
    if not task:
        return jsonify({'error': 'No task provided'}), 400
    tasks = session.get('tasks', [])
    tasks.append(task)
    session['tasks'] = tasks
    return jsonify({'status': 'added'})

@app.route('/tasks', methods=['GET'])
def get_tasks():
    return jsonify(session.get('tasks', []))

@app.route('/tasks/clear', methods=['POST'])
def clear_tasks():
    session['tasks'] = []
    return jsonify({'status': 'cleared'})



def create_app():
    app = Flask(__name__)

    @app.route("/")
    def index():
        return render_template("chatBotpage.html")

    @app.route("/transcribe", methods=["POST"])
    def transcribe():
        file = request.files["audio"]
        buffer = io.BytesIO(file.read())
        buffer.name = "audio.webm"

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=buffer
        )

        return jsonify({"transcript": transcript.text})

    return app

@app.route('/notes')
def notes_page():
    return render_template('notes.html')

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

if __name__ == "__main__":
    app.run(debug=True)