'use strict';

const backend = `http://127.0.0.1:5000`;
const params = new URLSearchParams(window.location.search);
const sessionIdParam = params.get('session_id');
const resultParam = params.get('result');
const sessionId = sessionIdParam ? Number.parseInt(sessionIdParam, 10) : null;

async function loadGameState() {
    if(!sessionId){
        alert('Game session not found. Returning to main menu.');
        goToMenu();
        return;
    }
    try {
        const response = await fetch(`${backend}/game_state/${sessionId}`);
        if(!response.ok){
            throw new Error('Failed to load game state');
        }
        const data = await response.json();

        populateEndscreen(data);
    } catch (error) {
        console.error('Failed to load game state:', error);
        alert('Unable to load the end screen. Returning to main menu.');
        goToMenu();
    }
}

function populateEndscreen(gameState) {
    const resultTitle = document.getElementById('result-title');
    const normalizedResult = (resultParam || gameState.status || '').toLowerCase();
    const isVictory = normalizedResult === 'won';

    resultTitle.className = `result-title ${isVictory ? 'victory' : 'defeat'}`;
    resultTitle.innerHTML = `
        <h1>${isVictory ? 'Victory!' : 'You Lost the Game'}</h1>
        <p>${isVictory ? 'Congratulations! You completed the game!' : 'Better luck next time!'}</p>
    `;

    document.getElementById('stat-player').textContent = gameState.player?.name || '-';
    document.getElementById('stat-difficulty').textContent = gameState.difficulty_level || '-';
    document.getElementById('stat-puzzles').textContent = gameState.puzzles_solved ?? 0;

    const batteryElement = document.getElementById('stat-battery');
    batteryElement.textContent = `${gameState.battery_level ?? 0}%`;
    batteryElement.classList.remove('battery-high', 'battery-medium', 'battery-low');

    if (gameState.battery_level > 50) {
        batteryElement.classList.add('battery-high');
    } else if (gameState.battery_level > 20) {
        batteryElement.classList.add('battery-medium');
    } else {
        batteryElement.classList.add('battery-low');
    }

    document.getElementById('stat-start').textContent =
        formatAirport(gameState.starting_airport);

    document.getElementById('stat-final').textContent =
        formatAirport(gameState.current_airport);

    document.getElementById('stat-boss').textContent =
        formatAirport(gameState.boss_airport);
}

function formatAirport(airport){
    if(!airport){
        return '-';
    }
    return `${airport.country_code || '--'}, ${airport.name || 'Unknown Airport'}`;
}

function goToMenu() {
    window.location.href = 'index.html';
}

window.addEventListener('DOMContentLoaded', loadGameState);
