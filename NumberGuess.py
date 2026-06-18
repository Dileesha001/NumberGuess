import random


def number_guessing_game():
    print("Welcome to the Number Guessing Game!")
    print("I have selected a number between 1 and 100.")

    # Generate a random number between 1 and 100
    secret_number = random.randint(1, 100)
    attempts = 0

    while True:
        try:
            guess = int(input("\nEnter your guess: "))

            # Check if the guess is within the valid range
            if guess < 1 or guess > 100:
                print("Out of bounds! Please guess a number between 1 and 100.")
                continue

            attempts += 1

            # Compare the guess to the secret number
            if guess < secret_number:
                print("Too low! Try again.")
            elif guess > secret_number:
                print("Too high! Try again.")
            else:
                print(f"🎉 Congratulations! You guessed the number {secret_number} correctly!")
                print(f"It took you {attempts} attempts to win.")
                break  # Exit the loop when the user wins

        except ValueError:
            # Handle the case where the user enters text instead of a number
            print("Invalid input! Please enter a whole number.")


if __name__ == "__main__":
    number_guessing_game()