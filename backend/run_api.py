# python
from flask import Flask, request, jsonify
from flask_cors import CORS
import api


app = Flask(__name__)
CORS(app)


@app.route('/airports', methods=['GET'])
def airports():
    result = api.get_available_airports()
    if result.is_error():
        return jsonify({"error": result.error}), 500
    return jsonify(result.value), 200


@app.route('/new_game', methods=['POST'])
def new_game():
    data = request.get_json(force=True)
    difficulty = data.get('difficulty')
    player_name = data.get('player_name')

    error: str = ""

    if not difficulty:
        error += "difficulty required. \n"
    if not player_name:
        error += "player_name required. \n"

    if error:
        return jsonify({"error": error}), 400

    configuration_result = api.configure_new_game(str(difficulty), str(player_name))
    if configuration_result.is_error():
        return jsonify({"error": configuration_result.error}), 400

    return jsonify({"session_id": configuration_result.value}), 201


@app.route('/challenge/<int:session_id>', methods=['GET'])
def challenge(session_id):
    result = api.get_challenge(session_id)
    if result.is_error():
        return jsonify({"error": result.error}), 404
    return jsonify(result.value), 200


@app.route('/update_state', methods=['POST'])
def update_state():
    data = request.get_json(force=True)
    session_id = data.get('session_id')
    current_airport_id = data.get('current_airport_id')
    passed_challenge = data.get('passed_challenge')

    error: str = ""

    if session_id is None:
        error += "session_id required. \n"
    if current_airport_id is None:
        error += "current_airport_id required. \n"
    if passed_challenge is None:
        error += "passed_challenge required. \n"

    if not isinstance(passed_challenge, bool):
        error += "passed_challenge must be a boolean. \n"
    if not isinstance(current_airport_id, int):
        error += "current_airport_id must be an integer. \n"
    if not isinstance(session_id, int):
        error += "session_id must be an integer. \n"

    if error:
        return jsonify({"error": error}), 400

    result = api.update_game_state(session_id, current_airport_id, passed_challenge)
    if result.is_error():
        return jsonify({"error": result.error}), 404
    return jsonify(result.value), 200


@app.route('/game_state/<int:session_id>', methods=['GET'])
def game_state(session_id):
    result = api.get_game_state(session_id)
    if result.is_error():
        return jsonify({"error": result.error}), 404
    return jsonify(result.value), 200


@app.route('/update_status/<int:session_id>', methods=['POST'])
def update_status(session_id):
    data = request.get_json(force=True)
    new_status = data.get('new_status')

    if not new_status:
        return jsonify({"error": "new_status required"}), 400

    result = api.update_session_status(session_id, new_status)
    if result.is_error():
        return jsonify({"error": result.error}), 404
    return jsonify("successfully updated status"), 200


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)