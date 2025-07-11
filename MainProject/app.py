from flask import Flask, request, jsonify, render_template, session
from flask_session import Session
from dotenv import load_dotenv
import os
from openai import OpenAI
import io

# Load environment variables from .env
load_dotenv()

app = Flask(__name__, template_folder='templates')  # templates folder
app.config.update(
    SESSION_PERMANENT=False,
    SESSION_TYPE="filesystem",
)
Session(app)
app.secret_key = 'supersecretkey'

# Initialize OpenAI client (new SDK style)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load system prompt from file
script_dir = os.path.dirname(os.path.abspath(__file__))
prompt_path = os.path.join(script_dir, 'topic_prompts', 'initial_prompt.txt')
with open(prompt_path, 'r', encoding='utf-8') as f:
    SYSTEM_PROMPT = f.read().strip()

@app.route('/')
def home():
    return render_template('chatBotpage.html')


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_msg = data.get("message", "")

    history = session.get('conversation', [])
    history.append({"role": "user", "content": user_msg})
    session['conversation'] = history
    try:
        resp = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history
        )
        gpt_reply = resp.choices[0].message.content
        return jsonify({"response": gpt_reply})
    except Exception as e:
        return jsonify({"response": "Sorry, I couldn't process your request.", "error": str(e)}), 500

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file provided"}), 400

        file = request.files["audio"]

        # Read file into buffer
        buffer = io.BytesIO(file.read())
        buffer.name = "audio.webm"  # OpenAI needs a filename

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=buffer,
        )

        # The transcript object has a 'text' attribute
        return jsonify({"transcript": transcript.text})

    except KeyError:
        return jsonify({"error": "Audio file missing"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
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

if __name__ == "__main__":
    app.run(debug=True)
