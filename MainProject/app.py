from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
from dotenv import load_dotenv
import os
from openai import OpenAI
load_dotenv()

app = Flask(__name__)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

openai.api_key = os.getenv("OPENAI_API_KEY")  
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
        resp = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history
        )
        reply = resp.choices[0].message.content.strip()
    except Exception as e:
        app.logger.error(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == "__main__":
    app.secret_key = 'supersecretkey'
    app.run(debug=True)

@app.route("/transcribe", methods=["POST"])
def transcribe():
    try:
        # Check if file exists
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