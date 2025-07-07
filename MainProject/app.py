from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
from dotenv import load_dotenv
import os, openai

load_dotenv()                                 
app = Flask(__name__, template_folder='.')    
app.config.update(
    SESSION_PERMANENT=False,
    SESSION_TYPE="filesystem",
)
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
        app.logger.error(e)
        reply = "Hmm, I’m having trouble responding right now — try again soon?"

    history.append({"role": "assistant", "content": reply})
    session['conversation'] = history
    return jsonify({'response': reply})

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
    app.secret_key = 'supersecretkey'
    app.run(debug=True)
