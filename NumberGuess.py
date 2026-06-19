import random
import json
import os

SCORES_FILE = "number_guess_scores.json"

def load_scores():
    if os.path.exists(SCORES_FILE):
        try:
            with open(SCORES_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {"Easy": None, "Medium": None, "Hard": None}

def save_scores(scores):
    try:
        with open(SCORES_FILE, 'w') as f:
            json.dump(scores, f, indent=4)
    except Exception as e:
        print(f"Could not save high scores: {e}")

def number_guessing_game():
    print("=" * 50)
    print("            NUMBER GUESSING GAME")
    print("=" * 50)

    scores = load_scores()
    
    # Print current high scores
    print("\n🏆 Current High Scores (Fewest Attempts):")
    for diff, score in scores.items():
        score_val = f"{score} attempts" if score is not None else "No score yet"
        print(f"  - {diff}: {score_val}")
    print("-" * 50)

    # Select difficulty
    print("Select Difficulty Level:")
    print("1. Easy (Range: 1-50, Attempts: 10)")
    print("2. Medium (Range: 1-100, Attempts: 8)")
    print("3. Hard (Range: 1-200, Attempts: 6)")
    
    difficulty = "Medium"
    max_num = 100
    max_attempts = 8
    
    while True:
        choice = input("Enter choice (1-3) [Default 2]: ").strip()
        if not choice:
            break
        if choice == '1':
            difficulty = "Easy"
            max_num = 50
            max_attempts = 10
            break
        elif choice == '2':
            difficulty = "Medium"
            max_num = 100
            max_attempts = 8
            break
        elif choice == '3':
            difficulty = "Hard"
            max_num = 200
            max_attempts = 6
            break
        else:
            print("Invalid selection! Please enter 1, 2, or 3.")

    print(f"\nGame Mode: {difficulty}")
    print(f"I have selected a number between 1 and {max_num}.")
    print(f"You have {max_attempts} attempts to guess it!")
    print("-" * 50)

    secret_number = random.randint(1, max_num)
    attempts_left = max_attempts
    attempts_made = 0
    guesses = set()
    min_bound = 1
    max_bound = max_num

    while attempts_left > 0:
        print(f"\nRange: {min_bound} - {max_bound} | Attempts remaining: {attempts_left}")
        try:
            guess_str = input("Enter your guess: ").strip()
            if not guess_str:
                continue
            guess = int(guess_str)

            # Check bounds
            if guess < 1 or guess > max_num:
                print(f"⚠️  Out of bounds! Please guess a number between 1 and {max_num}.")
                continue

            # Check duplicates
            if guess in guesses:
                print(f"⚠️  You already guessed {guess}! Try a different number.")
                continue

            guesses.add(guess)
            attempts_made += 1
            attempts_left -= 1

            if guess < secret_number:
                print("Too low! ⬇️")
                if guess >= min_bound:
                    min_bound = guess + 1
            elif guess > secret_number:
                print("Too high! ⬆️")
                if guess <= max_bound:
                    max_bound = guess - 1
            else:
                print(f"\n🎉 Congratulations! You guessed the number {secret_number} correctly!")
                print(f"It took you {attempts_made} attempts.")
                
                # Check for high score
                current_high = scores.get(difficulty)
                if current_high is None or attempts_made < current_high:
                    print(f"🏆 NEW HIGH SCORE for {difficulty} difficulty!")
                    scores[difficulty] = attempts_made
                    save_scores(scores)
                break

        except ValueError:
            print("❌ Invalid input! Please enter a whole number.")

    if attempts_left == 0 and secret_number not in guesses:
        print(f"\n💀 Game Over! You ran out of attempts.")
        print(f"The correct number was: {secret_number}")

if __name__ == "__main__":
    number_guessing_game()