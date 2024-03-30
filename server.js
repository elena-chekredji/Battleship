const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = []; // Array to keep track of the first two players
let p1, p2;
const startingPlayer = Math.random() < 0.5 ? 'p1' : 'p2';


wss.on('connection', function connection(ws) {
    // Check if we already have two players
    if (players.length < 2) {
        // Add this connection as a player
        players.push(ws);
        console.log(`Player ${players.length} has connected`);


        if(wss.clients.size <2){
            p1=ws;
        } else {
            p2=ws;
        }
        if(wss.clients.size === 2){
            console.log(startingPlayer);
            if(startingPlayer === 'p1'){
                p1.send('Your turn');
                p2.send('Opponent\'s turn');
            } else {
                p2.send('Your turn');
                p1.send('Opponent\'s turn');
            }
        }

        ws.on('message', function incoming(data) {
            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    // If `data` is not a string, stringify it
                    //let messageToSend = typeof data === 'string' ? data : JSON.stringify(data);
                    const dataToSend = JSON.parse(data);
                    client.send(JSON.stringify(dataToSend));
                }
            });
        });

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                //console.log('Received data:', data);
                //console.log('Received data:', data.data);
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        };

        // When a player disconnects, remove them from the array
        ws.on('close', () => {
            players = players.filter(player => player !== ws);
            console.log('Player disconnected');
        });
    } else {
        // If we already have two players, ignore the connection
        console.log('New connection ignored, already have two players');
        ws.close();
    }

});


app.use(express.static('public'));

const port = 3000;
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);

});

