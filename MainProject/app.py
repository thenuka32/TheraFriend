from flask import Flask, request, jsonify, render_template, session
from flask_session import Session
from dotenv import load_dotenv
import os
from openai import OpenAI
import io

load_dotenv()

app = Flask(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/')
def home():
    return render_template('index.html')


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_message = data.get("message", "")

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # or "gpt-4" if you have access
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": user_message}
            ]
        )
        gpt_reply = response.choices[0].message.content
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
        return jsonify({'error': 'No task'}), 400
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
