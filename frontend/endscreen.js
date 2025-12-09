'use strict'

const sessionId = 11 // tähän pelaajan sessioId
const backend = `http://127.0.0.1:5000`

async function loadGameState() {
    try {
        const response = await fetch(`${backend}/game_state/${sessionId}`);
        const data = await response.json();

        if (data.error) {
            console.error('Error loading game state:', data.error);
            return;
        }

        populateEndscreen(data);
    } catch (error) {
        console.error('Failed to load game state:', error);
    }
}

function populateEndscreen(gameState) {
    const resultTitle = document.getElementById('result-title');
    const isVictory = gameState.status === 'won';

    resultTitle.className = `result-title ${isVictory ? 'victory' : 'defeat'}`;
    resultTitle.innerHTML = `
        <h1>${isVictory ? 'Victory!' : 'You Lost the Game'}</h1>
        <p>${isVictory ? 'Congratulations! You completed the game!' : 'Better luck next time!'}</p>
    `;

    document.getElementById('stat-player').textContent = gameState.player.name;
    document.getElementById('stat-difficulty').textContent = gameState.difficulty_level;
    document.getElementById('stat-puzzles').textContent = gameState.puzzles_solved;

    const batteryElement = document.getElementById('stat-battery');
    batteryElement.textContent = `${gameState.battery_level}%`;

    if (gameState.battery_level > 50) {
        batteryElement.classList.add('battery-high');
    } else if (gameState.battery_level > 20) {
        batteryElement.classList.add('battery-medium');
    } else {
        batteryElement.classList.add('battery-low');
    }

    document.getElementById('stat-start').textContent =
        `${gameState.starting_airport.country_code}, ${gameState.starting_airport.name}`;

    document.getElementById('stat-final').textContent =
        `${gameState.current_airport.country_code}, ${gameState.current_airport.name}`;

    document.getElementById('stat-boss').textContent =
        `${gameState.boss_airport.country_code}, ${gameState.boss_airport.name}`;
}

function goToMenu() {
    window.location.href = null //startmenu.html tähän
}

window.addEventListener('DOMContentLoaded', loadGameState);