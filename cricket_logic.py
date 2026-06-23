import argparse
import json
import random
import base64
import sys
import os

SCORES_FILE = "cricket_scores.json"

def load_scores():
    if os.path.exists(SCORES_FILE):
        try:
            with open(SCORES_FILE, 'r') as f:
                scores = json.load(f)
                if isinstance(scores, dict):
                    if "high_score" not in scores:
                        scores["high_score"] = 0
                    return scores
        except Exception:
            pass
    return {"high_score": 0}

def save_scores(scores):
    try:
        with open(SCORES_FILE, 'w') as f:
            json.dump(scores, f, indent=4)
    except Exception as e:
        print(f"Could not save scores: {e}")

def play_ball(state):
    # state = {'runs': 0, 'wickets': 0, 'balls_faced': 0, 'max_balls': 12, 'game_over': False}
    
    if state.get('game_over', False):
        return state, "Game is already over!"
        
    outcomes = [0, 1, 2, 3, 4, 6, 'W']
    weights = [25, 30, 15, 5, 10, 10, 5]  # total 100
    
    result = random.choices(outcomes, weights=weights)[0]
    
    message = ""
    state['balls_faced'] = state.get('balls_faced', 0) + 1
    
    if result == 'W':
        state['wickets'] = state.get('wickets', 0) + 1
        message = "OUT! What a delivery!"
    else:
        state['runs'] = state.get('runs', 0) + result
        if result == 0:
            message = "Dot ball. Good bowling."
        elif result == 4:
            message = "FOUR! Great shot!"
        elif result == 6:
            message = "SIX! Out of the park!"
        else:
            message = f"You ran {result}."
            
    if state['wickets'] >= 10:
        state['game_over'] = True
        message += " ALL OUT!"
    elif state['balls_faced'] >= state.get('max_balls', 12):
        state['game_over'] = True
        message += " Innings over!"
        
    return state, message

def play_interactive_game():
    scores = load_scores()
    high_score = scores.get("high_score", 0)

    print("=" * 50)
    print("            🏏 MINI CRICKET BATTLE 🏏")
    print("=" * 50)
    print(f"🏆 Current High Score: {high_score} runs")
    print("Rules: Score as many runs as possible in 2 Overs (12 balls).")
    print("If you lose a wicket, your innings ends!")
    print("-" * 50)
    
    input("Press Enter to toss the coin and start... ")
    print("\n🪙 Toss won! You elected to bat first.")
    
    runs = 0
    wickets = 0
    balls_faced = 0
    max_balls = 12
    
    bowler_names = ["Jasprit Bumrah", "Mitchell Starc", "Nathan Lyon", "Rashid Khan", "Pat Cummins"]
    bowler_styles = ["Fast-medium", "Fast", "Off-spin", "Leg-spin", "Fast-medium"]
    
    current_bowler_idx = random.randint(0, len(bowler_names) - 1)
    
    # Over histories
    over_balls = []
    
    while balls_faced < max_balls and wickets < 1:
        over = balls_faced // 6
        ball_in_over = (balls_faced % 6) + 1
        
        # Change bowler at the start of new over
        if balls_faced > 0 and balls_faced % 6 == 0:
            print(f"\n🔄 End of Over {over}! Changing ends...")
            current_bowler_idx = (current_bowler_idx + 1) % len(bowler_names)
            input("Press Enter to continue to next over...")
            
        bowler = bowler_names[current_bowler_idx]
        style = bowler_styles[current_bowler_idx]
        
        speed = 0
        if "Fast" in style:
            speed = random.randint(130, 148)
        else:
            speed = random.randint(85, 102)
            
        print(f"\n[Ball {over}.{ball_in_over}] {bowler} ({style}) bowls @ {speed} km/h")
        print("Choose your shot:")
        print("1. Defensive Block  (Safe - low runs, 2% wicket)")
        print("2. Ground Drive     (Medium - moderate runs, 8% wicket)")
        print("3. Lofted Swing     (High Risk - big runs, 25% wicket)")
        
        shot = '2'
        while True:
            shot = input("Select shot (1-3) [Default 2]: ").strip()
            if not shot:
                shot = '2'
                break
            if shot in ['1', '2', '3']:
                break
            print("Invalid input! Enter 1, 2, or 3.")
            
        # Calculation based on shot
        result = 0
        is_out = False
        desc = ""
        
        if shot == '1': # Defend
            # 2% Wicket, 80% dot, 18% single
            r = random.random()
            if r < 0.02:
                is_out = True
                desc = "OUT! Bat-pad catch! Plucked by the short leg fielder."
            elif r < 0.82:
                result = 0
                desc = "Defended carefully right back to the bowler."
            else:
                result = 1
                desc = "Soft leading edge, scampered for a quick single."
        elif shot == '2': # Ground Drive
            # 8% Wicket, 30% dot, 32% singles/doubles, 30% four
            r = random.random()
            if r < 0.08:
                is_out = True
                desc = "OUT! Sliced cover drive caught at point!"
            elif r < 0.38:
                result = 0
                desc = "Driven hard but straight to the cover fielder."
            elif r < 0.58:
                result = 1
                desc = "Pushed wide of mid-on for a single."
            elif r < 0.70:
                result = 2
                desc = "Steered through backward point, running hard for two."
            else:
                result = 4
                desc = "FOUR! Elegant drive beats the cover sweeper!"
        else: # Lofted Swing
            # 25% Wicket, 15% dot, 10% singles, 20% four, 30% six
            r = random.random()
            if r < 0.25:
                is_out = True
                desc = "OUT! In the air and CAUGHT at long-on!"
            elif r < 0.40:
                result = 0
                desc = "Big swing and a miss! Past the outside edge."
            elif r < 0.50:
                result = 1
                desc = "Top edge falls in no man's land, single taken."
            elif r < 0.70:
                result = 4
                desc = "FOUR! One bounce and over the mid-wicket boundary!"
            else:
                result = 6
                desc = "SIX! Monumental strike! Clears the stadium roof! 💥"
                
        balls_faced += 1
        
        if is_out:
            wickets += 1
            over_balls.append('W')
            print(f"\n🛑 WICKET! {desc}")
        else:
            runs += result
            over_balls.append(str(result) if result > 0 else '.')
            print(f"\n🏏 Result: {desc}")
            
        print("-" * 50)
        print(f"Scorecard: {runs}/{wickets} | Overs: {balls_faced // 6}.{balls_faced % 6}")
        print(f"Over History: [{' '.join(over_balls[-6:])}]")
        print("=" * 50)
        
    print("\n" + "=" * 50)
    print("                MATCH OVER")
    print("=" * 50)
    print(f"Final Score: {runs} runs in {balls_faced} balls ({wickets} wicket lost)")
    
    if runs > high_score:
        print(f"🎉 CONGRATULATIONS! You set a NEW HIGH SCORE: {runs} runs!")
        scores["high_score"] = runs
        save_scores(scores)
    else:
        print(f"High Score remains: {high_score} runs")
    print("=" * 50)

def main():
    # If run without arguments, trigger the interactive CLI game
    if len(sys.argv) == 1:
        play_interactive_game()
        return

    parser = argparse.ArgumentParser(description='Mini Cricket Logic')
    parser.add_argument('--action', type=str, required=True, choices=['hit'])
    parser.add_argument('--state', type=str, required=True, help='JSON string of current state')
    
    args = parser.parse_args()
    
    try:
        try:
            # Decode base64 first to avoid escaping issues
            decoded_state = base64.b64decode(args.state).decode('utf-8')
            state = json.loads(decoded_state)
        except Exception:
            state = json.loads(args.state)
    except Exception as e:
        print(json.dumps({'error': f'Invalid state JSON: {str(e)}'}))
        return

    if args.action == 'hit':
        new_state, msg = play_ball(state)
        print(json.dumps({'state': new_state, 'message': msg}))

if __name__ == "__main__":
    main()
