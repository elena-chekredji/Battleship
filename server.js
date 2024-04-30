/**
 * Name: Elena
 * Last Name: Chekredji
 * Student Number: 501133464
 */

// Import necessary modules
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

// Create an Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server on the HTTP server
const wss = new WebSocket.Server({ server });

/** 
 * Array to keep track of the first two players' WebSocket connections.
 * @type {WebSocket[]}
 */
let players = [];
/** 
 * WebSocket connection for player 1.
 * @type {WebSocket | null}
 */
let p1 = null;

/** 
 * WebSocket connection for player 2.
 * @type {WebSocket | null}
 */
let p2 = null;

/** 
 * Flag indicating whether two players are connected.
 * @type {boolean}
 */
let twoConnections = false;

/**
 * Event listener for new WebSocket connections.
 * Manages player connections, game initialization, and message broadcasting.
 */
wss.on('connection', function connection(ws) {
    if (wss.clients.size < 3 ) {
        players.push(ws);

        console.log('Player ' , wss.clients.size,' has connected');

        if (wss.clients.size < 2) {
            p1 = ws;
            ws.send(JSON.stringify('Waiting for another player to connect'));
        } else {
            p2 = ws;
        }
        if(wss.clients.size === 2 && !twoConnections){
            const firstTurn = Math.random() < 0.5 ? 'p1' : 'p2';
            console.log('Player ', firstTurn, 'will go first!');

            // Inform the players whose turn it is
            if (firstTurn === 'p1') {
                p1.send(JSON.stringify('Your Turn'));
                p2.send(JSON.stringify('Opponents Turn'));
            } else {
                p2.send(JSON.stringify('Your Turn'));
                p1.send(JSON.stringify('Opponents Turn'));
                
            }
            twoConnections = true;
        }
               
        /**
         * Listener for incoming messages from players.
         * Broadcasts messages to the other player.
         */
        ws.on('message', function incoming(data) {
            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    const dataToSend = JSON.parse(data);
                    client.send(JSON.stringify(dataToSend));
                }
            });
        });

        /**
         * Listener for WebSocket connection closure.
         * Notifies remaining player and resets game state.
         */
        ws.on('close', () => {
            if(twoConnections) {
                console.log('A player disconnected');
                // Sends a message to the remaining player that their opponent has disconnected
                let remainingPlayer = players.find(player => player !== ws && player.readyState === WebSocket.OPEN);
                if(remainingPlayer) {
                    remainingPlayer.send(JSON.stringify('The other player has disconnected.'));
                }
        
                // Disconnect all players
                players.forEach(player => {
                    if (player.readyState === WebSocket.OPEN) {
                        player.close(); // This will close the connection
                    }
                });
    
                // Reset the state after disconnection
                players = [];
                p1 = null;
                p2 = null;
                twoConnections = false;
    
                console.log('All players have been disconnected');
                console.log('Current # of connections is :', wss.clients.size);

            }
        });        
    } else {
        // If we already have two players, ignore the connection
        console.log('New connection ignored, already have two players');
        ws.close();
    }

});

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Start the server
const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);

});






