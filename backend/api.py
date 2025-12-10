import random
from config import Config
from data import Difficulty, ChallengeType, OpenQuestion, MultipleChoiceQuestion, Result, ResultNoValue, SessionStatus
from models import DatabaseConnection, Airport, Player, GameSession, Challenge, Country


def _connect_to_db() -> Result[DatabaseConnection]:
    db = DatabaseConnection()
    connection_result = db.connect()
    if not connection_result.is_success():
        return Result.failure(f"Database connection failed: {connection_result.error}")
    return Result.success(db)


def get_available_airports() -> Result[list]:
    db = _connect_to_db()
    if db.is_error():
        return Result.failure(db.error)
    db = db.value

    try:
        airports = Airport(db).get_all_airports()
        return Result.success(airports)
    except Exception as ex:
        return Result.failure(f"Error retrieving airports: {ex}")
    finally:
        db.disconnect()


def configure_new_game(difficulty: str, player_name: str) -> Result[int]:
    try:
        difficulty = Difficulty(difficulty.strip().lower())
    except ValueError:
        difficulty = None

    if difficulty is None:
        return Result.failure("Invalid difficulty level. Choose from: 'easy', 'medium', 'hard'")

    db = _connect_to_db()
    if db.is_error():
        return Result.failure(db.error)
    db = db.value

    try:
        player = Player(db)
        if player.create_or_get_player(player_name):
            player.set_battery(Config.get_starting_battery(difficulty))
            player.set_difficulty(difficulty)

            airport_model = Airport(db)
            boss_airport =  airport_model.get_random_airport()

            game_session = GameSession(db)
            if not game_session.create_new_session(player.id, player.difficulty_level, boss_airport):
                return Result.failure("Failed to create game session")

            return Result.success(game_session.id)
        else:
            return Result.failure("Failed to create or retrieve player")
    except Exception as ex:
        return Result.failure(f"Error configuring new game: {ex}")
    finally:
        db.disconnect()


def get_challenge(session_id: int) -> Result[OpenQuestion | MultipleChoiceQuestion]:
    db = _connect_to_db()
    if db.is_error():
        return Result.failure(db.error)
    db = db.value

    game_session = GameSession(db)
    if not game_session.load_session(session_id):
        db.disconnect()
        return Result.failure("Invalid game session ID")

    difficulty = game_session.difficulty_level
    challenge_model = Challenge(db)
    challenge_type = random.choice([ChallengeType.OPEN_QUESTION, ChallengeType.MULTIPLE_CHOICE])

    try:
        match challenge_type:
            case ChallengeType.OPEN_QUESTION:
                c = challenge_model.get_random_open_question(difficulty)
                return Result.success(c)
            case ChallengeType.MULTIPLE_CHOICE:
                c = challenge_model.get_random_multiple_choice(difficulty)
                return Result.success(c)
        return Result.failure("Invalid challenge type")
    except Exception as ex:
        return Result.failure(f"Error retrieving challenge: {ex}")
    finally:
        db.disconnect()


def update_game_state(game_id: int, current_airport_id: int, passed_challenge: bool) -> Result[dict]:
    db = _connect_to_db()
    if db.is_error():
        return Result.failure(db.error)
    db = db.value

    try:
        game_session = GameSession(db)
        if not game_session.load_session(game_id):
            return Result.failure("Invalid game session ID")

        airport = Airport(db).get_airport_by_id(current_airport_id)
        country = Country(db).get_country_by_code(airport.country_code)

        game_session.update_current_airport(airport)
        game_session.increment_puzzles_solved()
        game_session.add_guessed_country(country)

        match passed_challenge:
            case True:
                game_session.add_battery(Config.get_battery_reward(game_session.difficulty_level))
            case False:
                game_session.deduct_battery(Config.get_battery_penalty(game_session.difficulty_level))

        state = game_session.get_game_state()
        return Result.success(state)
    except Exception as ex:
        return Result.failure(f"Error updating game state: {ex}")
    finally:
        db.disconnect()


def get_game_state(session_id: int) -> Result[dict]:
    db = _connect_to_db()
    if db.is_error():
        return Result.failure(db.error)
    db = db.value

    try:
        game_session = GameSession(db)
        if not game_session.load_session(session_id):
            return Result.failure("Invalid game session ID")

        state = game_session.get_game_state()
        return Result.success(state)
    except Exception as ex:
        return Result.failure(f"Error retrieving game state: {ex}")
    finally:
        db.disconnect()


def update_session_status(session_id: int, status: str) -> ResultNoValue:
    try:
        status = SessionStatus(status.strip().lower())
    except ValueError:
        status = None

    if status is None:
        return ResultNoValue.failure("Invalid session status, choose from : 'active', 'won', 'lost', 'abandoned'")

    db = _connect_to_db()
    if db.is_error():
        return ResultNoValue.failure(db.error)
    db = db.value

    try:
        game_session = GameSession(db)
        if not game_session.load_session(session_id):
            return ResultNoValue.failure("Invalid game session ID")

        game_session.update_status(status)
        return ResultNoValue.success()
    except Exception as ex:
        return ResultNoValue.failure(f"Error updating session status: {ex}")
    finally:
        db.disconnect()


if __name__ == '__main__':
    sesh_id = 76
    print(f"New game session ID: {sesh_id}")
    challenge = get_challenge(sesh_id)
    print(f"Challenge: {challenge}")
    game_state = get_game_state(sesh_id)
    print(f"Game State: {game_state}")
    new_state = update_game_state(str(sesh_id), '4', False)
    print(f"Updated Game State: {new_state}")
