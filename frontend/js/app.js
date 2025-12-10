import { calculateDistance, calculateBearing, getCompassDirection } from './utils.js';
import { initializeCustomMap, createPurpleMarker } from './map.js';

const API_URL = "https://bossflights-api.up.railway.app:5000/";

const urlParams = new URLSearchParams(window.location.search);
const sessionIdParam = urlParams.get('session_id');
const parsedSessionId = sessionIdParam ? Number.parseInt(sessionIdParam, 10) : null;

const startMenuData = {
    playerName: urlParams.get('player_name') ? urlParams.get('player_name').trim() : '',
    difficulty: urlParams.get('difficulty') ? urlParams.get('difficulty').toLowerCase() : ''
};

const allowedDifficulties = new Set(['easy', 'medium', 'hard']);
if (startMenuData.difficulty && !allowedDifficulties.has(startMenuData.difficulty)) {
    startMenuData.difficulty = '';
}

let sessionId = Number.isNaN(parsedSessionId) ? null : parsedSessionId;

let map;

let gameData = null;

let currentChallenge = null;

let currentAirportMarker = null;

let currentChallengeResolved = false;
let hideChallengeTimer = null;
let gameEnded = false;
let pendingChallengeSuccess = false;
let lastKnownState = null;

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
   if(!sessionId){
        return null
    }
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
    if(!sessionId){
        return null
    }
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
    if(gameEnded){
        return;
    }
    const challenge = await fetchChallenge(sessionId);
    if(!challenge){
        console.log('Failed to load challenge')
        return
    }
    currentChallenge = challenge
    currentChallengeResolved = false;
    if(hideChallengeTimer){
        clearTimeout(hideChallengeTimer);
        hideChallengeTimer = null;
    }
    showChallenge(challenge)

}

async function updateGameState(sessionId, currentAirportId, passedChallenge){
    if(gameEnded){
        return null
    }
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
    
    if(!startMenuData.playerName || !startMenuData.difficulty){
        alert('Please start the game from the start menu so we know who is playing.');
        window.location.href = 'start.html';
        return;
    }

    const airports = await fetchAirports();
    if (!airports || airports.length === 0) {
        console.error('Failed to load airports');
        return;
    }

    gameData = { airports };
    renderAirportsOnMap(airports);

    if(!sessionId){
        sessionId = await createNewGame(startMenuData.difficulty, startMenuData.playerName);
    }
    if(!sessionId){
        console.error('error: failed to create session')
        alert('Failed to create a game session. Returning to the start menu.');
        window.location.href = 'start.html';
        return 
    }
    console.log('Session ready', sessionId)

    await refreshGameState()
}

async function refreshGameState() {
    if(!sessionId){
        return
    }
    const state = await fetchGameState(sessionId)
    if(!state){
        console.log('Failed to refresh game state')
        return
    }
    updatePlayerDataFromState(state)
    console.log(state)
    await checkForGameConclusion(state)
    return state;
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
 
    if(currentAirport && playerLocation){
        playerLocation.textContent = currentAirport.name
    }

    const destinationsVisited = document.getElementById('destinations-visited');
    if(destinationsVisited){
        const visitedCount = state.puzzles_solved || 0
        destinationsVisited.textContent = `${visitedCount} ${visitedCount === 1 ? 'airport' : 'airports'}`
    }

    const distanceToBoss = document.getElementById('distance');
    
    const bossAirport = state.boss_airport;
    const directionElement = document.getElementById('direction');
    const compassArrow = document.getElementById('compass-arrow');

    if (currentAirport && bossAirport) {
        const distance = calculateDistance(
            currentAirport.latitude, 
            currentAirport.longitude,
            bossAirport.latitude,
            bossAirport.longitude
        );
        distanceToBoss.textContent = Math.round(distance) + ' km';

        const bearing = calculateBearing(
            currentAirport.latitude,
            currentAirport.longitude,
            bossAirport.latitude,
            bossAirport.longitude
        );
        const compassDirection = getCompassDirection(bearing);
        directionElement.textContent = compassDirection;

        if (compassArrow) {
            const adjustedRotation = bearing - 90;
            compassArrow.style.transform = `rotate(${adjustedRotation}deg)`;
        }
    } else {
        distanceToBoss.textContent = 'Unknown';
        directionElement.textContent = '-';
        if (compassArrow) {
            compassArrow.style.transform = 'rotate(0deg)';
        }
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

    lastKnownState = state;
}

window.flyToAirport = async function(airportId){
    if(!sessionId){
        console.warn('Cannot fly without an active session.')
        return
    }
    if(gameEnded){
        return
    }

    const state = await fetchGameState(sessionId)
    if(!state){
        return
    }
    const targetAirport = gameData.airports.find(a=> a.id === airportId)
    if(!targetAirport){
        console.warn('Airport not found', airportId)
        return
    }
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
        const passedPreviousChallenge = pendingChallengeSuccess;
        const result = await updateGameState(sessionId, Number(targetAirport.id), passedPreviousChallenge);
        if (result) {
            pendingChallengeSuccess = false;
            await refreshGameState();
            if(!gameEnded){
                await loadChallenge();
            }
        } else {
            pendingChallengeSuccess = passedPreviousChallenge;
        }
    }, 1500);

}


function showChallenge(challenge){
    if(!challenge || gameEnded){
        return
    }
    const challengeSection = document.getElementById('challenge-section')

    const challengeQuestion = document.getElementById('challenge-question')

    const openAnswerSection = document.getElementById('open-answer-section')

    const multipleChoiceSection = document.getElementById('multiple-choice-section')

    const resultElement = document.getElementById('challenge-result')

    const answerInput = document.getElementById('answer-input');
    const openAnswerButton = document.getElementById('open-answer-submit');
    if(answerInput){
        answerInput.value = "";
        answerInput.disabled = false;
    }
    if(openAnswerButton){
        openAnswerButton.disabled = false;
    }

    if(challengeSection) challengeSection.style.display = "block"
    if(resultElement){
        resultElement.style.display = "none"
        resultElement.textContent = ""
        resultElement.className = "challenge-result"
    }

    if (challenge.type === "open_question"){
        challengeQuestion.textContent = challenge.question
        openAnswerSection.style.display ="block"
        multipleChoiceSection.style.display ="none"
    }
    
    else if(challenge.type === "multiple_choice"){
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

function finishChallengeDisplay(){
    if(hideChallengeTimer){
        clearTimeout(hideChallengeTimer)
    }
    hideChallengeTimer = setTimeout(() => {
        hideChallengeImmediately()
    }, 2000)
}

function hideChallengeImmediately(){
    if(hideChallengeTimer){
        clearTimeout(hideChallengeTimer)
        hideChallengeTimer = null
    }
    const challengeSection = document.getElementById('challenge-section')
    if(challengeSection){
        challengeSection.style.display = "none"
    }
    const answerOptions = document.getElementById('answer-options')
    if(answerOptions){
        answerOptions.innerHTML = ""
    }
    const resultElement = document.getElementById('challenge-result')
    if(resultElement){
        resultElement.style.display = "none"
        resultElement.textContent = ""
        resultElement.className = "challenge-result"
    }
    const answerInput = document.getElementById('answer-input')
    if(answerInput){
        answerInput.value = ""
        answerInput.disabled = false
    }
    const submitButton = document.getElementById('open-answer-submit')
    if(submitButton){
        submitButton.disabled = false
    }
}

function getCurrentDifficulty(){
    if(lastKnownState && lastKnownState.difficulty_level){
        return lastKnownState.difficulty_level.toLowerCase()
    }
    if(startMenuData.difficulty){
        return startMenuData.difficulty
    }
    return 'medium'
}

function getChallengeRewardAmount(){
    const difficulty = getCurrentDifficulty()
    switch(difficulty){
        case 'easy':
            return 20
        case 'hard':
            return 10
        case 'medium':
        default:
            return 15
    }
}

function clampBattery(value){
    return Math.max(0, Math.min(100, value))
}

function adjustBatteryLocally(delta){
    if(!lastKnownState){
        lastKnownState = {
            battery_level: 0
        }
    }
    const batteryElement = document.getElementById('player-battery')
    const batteryStatus = document.getElementById('battery-status')
    let currentValue = typeof lastKnownState.battery_level === 'number'
        ? lastKnownState.battery_level
        : 0
    if((Number.isNaN(currentValue) || currentValue === 0) && batteryElement && batteryElement.textContent){
        const parsed = parseInt(batteryElement.textContent.replace('%','').trim(), 10)
        if(!Number.isNaN(parsed)){
            currentValue = parsed
        }
    }
    const nextValue = clampBattery(currentValue + delta)
    lastKnownState.battery_level = nextValue
    if(batteryElement){
        batteryElement.textContent = `${nextValue}%`
    }

    if(batteryStatus && delta !== 0){
        const sign = delta > 0 ? '+' : ''
        const statusText = `${sign}${delta}%`
        const statusColor = delta > 0 ? '#00ff88' : '#ff0000'

        batteryStatus.textContent = statusText
        batteryStatus.style.color = statusColor
        batteryStatus.style.display = 'block'

        setTimeout(()=>{
            batteryStatus.style.opacity='0'
            batteryStatus.style.transition = 'opacity 0.5s ease-out'
        }, 1500)

        setTimeout(()=>{
            batteryStatus.textContent = ''
            batteryStatus.style.opacity = '1'
            batteryStatus.style.transition = 'none'
            batteryStatus.style.display = 'none'
        }, 2000)

    }
}

async function checkForGameConclusion(state){
    if(gameEnded || !state){
        return
    }
    if(state.battery_level <= 0){
        await handleGameConclusion('lost', state)
        return
    }
    if(state.current_airport && state.boss_airport && state.current_airport.id === state.boss_airport.id){
        await handleGameConclusion('won', state)
    }
}

async function handleGameConclusion(result, state){
    if(gameEnded){
        return
    }
    gameEnded = true
    currentChallengeResolved = true
    hideChallengeImmediately()
    const sessionIdentifier = state?.session_id || sessionId
    const normalizedResult = result === 'won' ? 'won' : 'lost'
    await setSessionStatus(sessionIdentifier, normalizedResult)

    const params = new URLSearchParams({
        session_id: sessionIdentifier,
        result: normalizedResult
    })
    window.location.href = `end.html?${params.toString()}`
}

async function setSessionStatus(sessionIdentifier, newStatus){
    if(!sessionIdentifier){
        return
    }
    try{
        const response = await fetch(`${API_URL}update_status/${sessionIdentifier}`,{
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ new_status: newStatus })
        })
        if(!response.ok){
            const error = await response.json()
            console.error('Failed to update session status', error)
        }
    } catch (error){
        console.error('Error calling update_status', error)
    }
}

async function submitMultiplechoiceAnswer(isCorrect){
    if(currentChallengeResolved || gameEnded){
        return;
    }
    currentChallengeResolved = true;
    const answerOptions = document.getElementById('answer-options')
    if(answerOptions){
        const buttons = answerOptions.querySelectorAll("button")
        buttons.forEach(btn => btn.disabled = true)
    }
    const resultElement = document.getElementById('challenge-result')
    if(isCorrect){
        resultElement.textContent = "Correct answer!"
        resultElement.className = "challenge-result correct"
    } else {
        const correctAnswer = currentChallenge && currentChallenge.options
            ? currentChallenge.options.find(a=>a.is_correct)
            : null
        if(correctAnswer){
            resultElement.textContent = "Incorrect answer! The correct answer is: " + correctAnswer.name
        } else {
            resultElement.textContent = "Incorrect answer!"
        }
        resultElement.className = "challenge-result incorrect"
        // apply battery penalty for incorrect multiple-choice answers
        try{
            adjustBatteryLocally(-getChallengeRewardAmount())
            await checkForGameConclusion(lastKnownState)
        } catch (e) {
            console.error('Error applying penalty for incorrect answer', e)
        }
    }
    resultElement.style.display = "block"
    pendingChallengeSuccess = Boolean(isCorrect)
    if(pendingChallengeSuccess){
        adjustBatteryLocally(getChallengeRewardAmount())
        await checkForGameConclusion(lastKnownState)
    }
    finishChallengeDisplay()
}

window.submitOpenAnswer = async function(){
    if(currentChallengeResolved || gameEnded){
        return
    }
    const resultElement = document.getElementById('challenge-result')
    const userAnswer = document.getElementById('answer-input').value.trim()
    if (!userAnswer){
        alert("Answer the question!")
        return
    }
    if(!currentChallenge || !currentChallenge.answer){
        return
    }
    const correctAnswer = currentChallenge.answer.toLowerCase()
    const isCorrect = userAnswer.toLowerCase() === correctAnswer
    currentChallengeResolved = true

    if(isCorrect){
        resultElement.textContent = "Correct answer!"
        resultElement.className = "challenge-result correct"
    } else {
        resultElement.textContent = "Incorrect answer! The correct answer is: " + currentChallenge.answer
        resultElement.className = "challenge-result incorrect"
        // apply battery penalty for incorrect open answers
        try{
            adjustBatteryLocally(-getChallengeRewardAmount())
            await checkForGameConclusion(lastKnownState)
        } catch (e) {
            console.error('Error applying penalty for incorrect open answer', e)
        }
    }
    resultElement.style.display = "block"
    const answerInput = document.getElementById('answer-input')
    const submitButton = document.getElementById('open-answer-submit')
    if(answerInput){
        answerInput.disabled = true
    }
    if(submitButton){
        submitButton.disabled = true
    }
    pendingChallengeSuccess = Boolean(isCorrect)
    if(pendingChallengeSuccess){
        adjustBatteryLocally(getChallengeRewardAmount())
        await checkForGameConclusion(lastKnownState)
    }
    finishChallengeDisplay()
}




initializeGame();
