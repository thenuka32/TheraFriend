from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
import openai
import os

app = Flask(__name__)

# Session configuration
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

openai.api_key = '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'  # Use environment variable for safety
app.secret_key = 'supersecretkey'


# Home route
@app.route('/')
def home():
    return render_template('index.html')


# Chat route - handles the conversation with the LLM
@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '')

    if 'conversation' not in session:
        session['conversation'] = []

    session['conversation'].append({"role": "user", "content": user_message})

    # System prompt for the chatbot
    system_message = {"role": "system", "content": "You are a helpful assistant."}
    messages = [system_message] + session['conversation']

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        gpt_response = response.choices[0].message.content
        session['conversation'].append({"role": "assistant", "content": gpt_response})
        return jsonify({'response': gpt_response})
    except Exception as e:
        app.logger.error(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500


# Clear session route
@app.route('/clear_session', methods=['GET'])
def clear_session():
    # Clear the session
    session.clear()
    return jsonify({'status': 'session cleared'})


if __name__ == '__main__':
    app.run(debug=True)
