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

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app.secret_key = 'supersecretkey'

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '')

    if 'conversation' not in session:
        session['conversation'] = []

    session['conversation'].append({"role": "user", "content": user_message})

    # Read initial prompt from file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    text_file_path = os.path.join(script_dir, 'topic_prompts', 'initial_prompt.txt')
    if not os.path.exists(text_file_path):
        return jsonify({'response': 'Initial prompt file not found.'})

    with open(text_file_path, 'r') as file:
        initial_prompt = file.read()

    system_message = {"role": "system", "content": initial_prompt}
    messages = [system_message] + session['conversation']

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        gpt_response = response.choices[0].message.content
        session['conversation'].append({"role": "assistant", "content": gpt_response})
        return jsonify({'response': gpt_response})
    except Exception as e:
        app.logger.error(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == "__main__":
    app.run(debug=True)
