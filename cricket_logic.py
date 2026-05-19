import argparse
import json
import random

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

def main():
    parser = argparse.ArgumentParser(description='Mini Cricket Logic')
    parser.add_argument('--action', type=str, required=True, choices=['hit'])
    parser.add_argument('--state', type=str, required=True, help='JSON string of current state')
    
    args = parser.parse_args()
    
    try:
        state = json.loads(args.state)
    except json.JSONDecodeError:
        print(json.dumps({'error': 'Invalid state JSON'}))
        return

    if args.action == 'hit':
        new_state, msg = play_ball(state)
        print(json.dumps({'state': new_state, 'message': msg}))

if __name__ == "__main__":
    main()
