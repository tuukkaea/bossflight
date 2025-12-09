import { calculateDistance, calculateBearing, getCompassDirection } from './utils.js';
import { initializeCustomMap, createPurpleMarker } from './map.js';

const API_URL = "http://127.0.0.1:5000/"

let sessionId = null

let map;

let gameData = null

let currentChallenge = null

let currentAirportMarker = null;

async function fetchAirports() {
   try{
    const response = await fetch(`${API_URL}airports`);
    if (!response.ok) {
            throw new Error('Failed to fetch airport');
        }
        const data = await response.json();
        console.log(data)
        return data;
    } catch (error) {
        console.error('error:', error);
   } 
}
async function createNewGame(difficulty, playerName){
    try{
        const response = await fetch(`${API_URL}new_game`,{
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                difficulty: difficulty,
                player_name: playerName,

            })
        });
        if(!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create game');

        }
        const data = await response.json();
        return data.session_id
    }
    catch (error) {
        console.error('error: Creating new game', error,);
        return null}
}

async function fetchGameState(sessionId) {
   try{
    const response = await fetch(`${API_URL}game_state/${sessionId}`);
    if (!response.ok) {
            throw new Error('failed to fetch game state');
        }
        const data = await response.json();
        console.log(data)
        return data;
    } catch (error) {
        console.error('Failed to fetch game state', error);
        return null
   } 
}

async function fetchChallenge(sessionId) {
   try{
    const response = await fetch(`${API_URL}challenge/${sessionId}`);
    if (!response.ok) {
            throw new Error('failed to fetch challenge');
        }
        const data = await response.json();
        console.log(data)
        return data;
    } catch (error) {
        console.error('Failed to fetch challenge', error);
        return null
   } 
}

async function loadChallenge(){
    const challenge = await fetchChallenge(sessionId);
    if(!challenge){
        console.log('Failed to load challenge')
        return
    }
    showChallenge(challenge)

}

async function updateGameState(sessionId, currentAirportId, passedChallenge){
    try{
        const response = await fetch(`${API_URL}update_state`,{
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                current_airport_id: currentAirportId,
                passed_challenge: passedChallenge,

            })
        });
        if(!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update gamestate');

        }
        const data = await response.json();
        return data
    }
    catch (error) {
        console.error('error: Updating gamestate', error,);
        return null}
}

function renderAirportsOnMap(airports) {
    const purpleMarker = createPurpleMarker();
    
    airports.forEach(airport => {
        const marker = L.marker([airport.latitude, airport.longitude], { icon: purpleMarker })
            .addTo(map);
        
        const popupContent = `
            <div class="airport-popup">
                <b>${airport.name}</b>
                <p class="airport-code">${airport.iata_code} / ${airport.icao_code}</p>
                <p class="airport-location">${airport.city}, ${airport.country_code}</p>
                <button class="fly-button" onclick="flyToAirport(${airport.id})">
                     Fly Here
                </button>
            </div>
        `;
        
        marker.bindPopup(popupContent);
    });
}

async function initializeGame() {
    map = initializeCustomMap('map');
    const playerName = "Default"
    const difficulty = "Easy"
    const airports = await fetchAirports();
    if (!airports || airports.length === 0) {
        console.error('Failed to load airports');
        return;
    }

    gameData = { airports };
    renderAirportsOnMap(airports);

    sessionId = await createNewGame(difficulty, playerName);
    if(!sessionId){
        console.error('error: failed to create session')
        return 
    }
    console.log('Session created', sessionId)

    await refreshGameState()
}

async function refreshGameState() {
    const state = await fetchGameState(sessionId)
    if(!state){
        console.log('Failed to refresh game state')
        return
    }
    updatePlayerDataFromState(state)
    console.log(state)
}

function updatePlayerDataFromState(state){
    const playerName = document.getElementById('player-name');
    playerName.textContent = state.player.name

    const batteryLevel = document.getElementById('player-battery');
    batteryLevel.textContent = state.battery_level + '%'

    const playerDifficulty = document.getElementById('difficulty');
    playerDifficulty.textContent = state.difficulty_level

    const playerLocation = document.getElementById('current-location');
    const currentAirport = state.current_airport;
 
    playerLocation.textContent = currentAirport.name

    const destinationsVisited = "5";


    const distanceToBoss = document.getElementById('distance');
    
    const bossAirport = state.boss_airport;

    const distance = calculateDistance(
        currentAirport.latitude, 
        currentAirport.longitude,
        bossAirport.latitude,
        bossAirport.longitude
    );
    distanceToBoss.textContent = Math.round(distance) + ' km';

    const directionElement = document.getElementById('direction');
    const bearing = calculateBearing(
        currentAirport.latitude,
        currentAirport.longitude,
        bossAirport.latitude,
        bossAirport.longitude
    );
    const compassDirection = getCompassDirection(bearing);
    directionElement.textContent = compassDirection;

    const compassArrow = document.getElementById('compass-arrow');
    if (compassArrow) {

        const adjustedRotation = bearing - 90;
        compassArrow.style.transform = `rotate(${adjustedRotation}deg)`;
    }
    
    if (currentAirportMarker) {
        map.removeLayer(currentAirportMarker);
    }

    if (currentAirport) {
        const currentIcon = L.divIcon({
            className: 'custom-purple-marker current-airport-marker',
            html:` 
                <div class="marker-dot">
                    <div class="dot-glow"></div>
                    <div class="dot-center"></div>
                </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -8]
        });

        currentAirportMarker = L.marker([currentAirport.latitude, currentAirport.longitude], { icon: currentIcon })
            .addTo(map)
            .bindPopup(`<b class="text-white">Current Location: ${currentAirport.name}</b>`);
    }
}

window.flyToAirport = async function(airportId){
    const state = await fetchGameState(sessionId)
    const targetAirport = gameData.airports.find(a=> a.id === airportId)
    map.closePopup()
    const currentAirport = state.current_airport

const flightLine = L.polyline(
        [[currentAirport.latitude, currentAirport.longitude], 
        [targetAirport.latitude, targetAirport.longitude]], 
        {
            color: '#9F27F5',
            weight: 3,
            opacity: 0,
            dashArray: '10, 10',
            className: 'flight-path'
        }
    ).addTo(map);
    
    let opacity = 0;
    const fadeIn = setInterval(() => {
        opacity += 0.05;
        flightLine.setStyle({ opacity: Math.min(opacity, 0.8) });
        if (opacity >= 0.8) clearInterval(fadeIn);
    }, 30);
    
    setTimeout(async () => {
        const fadeOut = setInterval(() => {
            opacity -= 0.1;
            flightLine.setStyle({ opacity: Math.max(opacity, 0) });
            if (opacity <= 0) {
                clearInterval(fadeOut);
                map.removeLayer(flightLine);
            }
        }, 30);
        
        const result = await updateGameState(sessionId, airportId, true);
        if (result) {
            await refreshGameState();
            await loadChallenge();
        }
    }, 1500);

}


function showChallenge(challenge){
    const challengeSection = document.getElementById('challenge-section')

    const challengeQuestion = document.getElementById('challenge-question')

    const openAnswerSection = document.getElementById('open-answer-section')

    const multipleChoiceSection = document.getElementById('multiple-choice-section')

    if(challengeSection) challengeSection.style.display = "block"

    if (challenge.type === "open_question"){
        challengeQuestion.textContent = challenge.question
        openAnswerSection.style.display ="block"
        multipleChoiceSection.style.display ="none"
    }
    
    else if(challenge.type = "multiple_choice"){
        challengeQuestion.textContent = challenge.question
        openAnswerSection.style.display ="none"
        multipleChoiceSection.style.display ="block"

        const answerOptions = document.getElementById('answer-options')
        answerOptions.innerHTML = "";
        challenge.options.forEach(option=>{
            const button = document.createElement("button")
            button.textContent = option.name
            button.className = "answer-option"
            button.onclick = () => submitMultiplechoiceAnswer(option.is_correct)
            answerOptions.appendChild(button)

        })
    }


     
    }

function submitMultiplechoiceAnswer(isCorrect){
    const answerOptions = document.getElementById('answer-choice-options')
    answerOptions.innerHTML = "";
    const resultElement = document.getElementById('challenge-result')
    const buttons = document.querySelectorAll(".answer-option")
    if(isCorrect){
        resultElement.textContent = "Correct answer!"
        resultElement.className = "challenge-result correct"
    } else {
        const correctAnswer = currentChallenge.data.answers.find(a=>a.is_correct)
        resultElement.textContent = "Incorrect answer!"
        resultElement.className = "challenge-result incorrect"
    }
    resultElement.style.display = "block"
}

window.submitOpenAnswer = function(){
    console.log("toimiiko")
    const resultElement = document.getElementById('challenge-result')
    const userAnswer = document.getElementById('answer-input').value.trim()
    if (!userAnswer){
        alert("Answer the question!")
        return
    }
    const correctAnswer = currentChallenge.data.correct_answer.toLowerCase()
    const isCorrect = userAnswer.toLowerCase() === correctAnswer

    if(isCorrect){
        resultElement.textContent = "Correct answer!"
        resultElement.className = "challenge-result correct"
    } else {
        resultElement.textContent = "Incorrect answer! The correct answer is: " + currentChallenge.data.correct_answer
        resultElement.className = "challenge-result incorrect"
    }
    resultElement.style.display = "block"
}



initializeGame();