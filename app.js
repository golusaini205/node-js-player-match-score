const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')

const app = express()

const dbPath = path.join(__dirname, 'cricketMatchDetails.db')

app.use(express.json())
let db = null

const initilizeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log(`Server running at http://localhost:3000`)
    })
  } catch (e) {
    console.log(`DB Error ${e.message}`)
    process.exit(1)
  }
}

initilizeDBAndServer()


const convertPlayerDetailsToResponseOnject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  }
}

const convertMatchDetailsToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  }
}

const convertPlayerMatchScoreToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sizes: dbObject.sixes,
  }
}


//GET API (return a list of all the players in the player table)

app.get('/players/', async (request, response) => {
  const returnPlayers = `
    SELECT 
        player_id AS playerId,
        player_name AS playerName
    FROM 
        player_details;`;

  const player = await db.all(returnPlayers)
  response.send(player);
})

//GET PLAYERS:PLAYEID (Returnsa specific player based on the player ID)

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params;

  const returnPlayerId = `
        SELECT
            player_id AS playerId, 
            player_name AS playerName
        FROM 
            player_details
        WHERE 
            player_id = ${playerId} ;
    `
  const player = await db.get(returnPlayerId)
  response.send(player);
})

//UPDATE PLAYERS:PLAYERID (Updates the details of a specific player based on the player Id)


app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params;
  const {playerName} = request.body;
  const playerIdArray = `
  UPDATE
    player_details
  SET 
    player_name = '${playerName}'
  WHERE 
    player_id = ${playerId};`;

  await db.run(playerIdArray);
  response.send("Player Details Updated");
})

//GET MATCHES:MATCHID (returns the match details of a specific match)

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params

  const returnMatchId = `
        SELECT
            match_id AS matchId,
            match,
            year
        FROM 
            match_details
        WHERE 
            match_id = '${matchId}';
    `
  const match_id = await db.get(returnMatchId)
  response.send(match_id);
})



//GET PLAYERS:PLAYERID/MATCHES (Return a list of all the matches of a player)


app.get('/players/:playerId/matches/', async (request, response) =>{
  const { playerId } = request.params;
  const playerIdMatchesArray = `
  SELECT 
    *
  FROM 
    player_match_score NATURAL JOIN match_details
  WHERE 
    player_id = ${playerId};`;


  const resultPlayerId = await db.all(playerIdMatchesArray);
  response.send(resultPlayerId.map(e => convertMatchDetailsToResponseObject(e)));

})



//GET MATCHES:MATCHID/PLAYERS

app.get('/matches/:matchId/players', async (request, response) =>{
  const {matchId} = request.params;
  const matchIdPlayersArray = `
  SELECT 
    player_match_score.player_id AS playerId,
    player_name AS playerName
  FROM 
    player_details INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
  WHERE 
    match_id = ${matchId};`;

  const matchIdPlayersResult = await db.all(matchIdPlayersArray);
  response.send(matchIdPlayersResult);

})


//GET PLAYERS:PLAYERID/PLAERSCORE (return the statistics of the total score, fours, sixes of a specific player based on the player Id)


app.get('/players/:playerId/playerScores/', async (request, response) =>{
  const {playerId} = request.params;
  const getPlayerScoreQuery =  `
  SELECT 
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes
  FROM 
    player_details INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
  WHERE 
    player_details.player_id = ${playerId};`;


  const playerScore = await db.get(getPlayerScoreQuery);
  response.send(playerScore);
});


module.exports = app;