require('dotenv').config();

const express = require('express');
const app = express();

const SteamUser = require('steam-user');

const Login = () => {     
    const steamAccNames = process.env.STEAMACCS.split('|');
    steamAccNames.forEach((steamAccName) => {
        const steamClient = new SteamUser();
		try {
			steamClient.logOn({
				accountName: steamAccName,
				password: process.env.STEAMPASSWORD,
				apiKey: process.env.STEAMAPIKEY,
			}); 
		}catch(e){
			console.log("Failed to log in");
		}
		steamClient.on('loggedOn', () => {
			steamClient.setPersona(SteamUser.EPersonaState.Online);
			steamClient.gamesPlayed(process.env.STEAMGAMES.split(',').map(Number));
		});
		steamClient.on('error', (err) => {
			console.log(`Error with account ${steamAccName}:`, err);
		});
    });
}
Login();
setTimeout(() => {
    console.log("restarting app");
    server.close(() => {
        process.exit(1);
    });
}, 60 * 60 * 1e3);

app.use(express.static("public"));
app.use(express.json());

var queue = [];
app.get("/", async function(req, res) {
	res.send(queue[0]);
	queue.shift();
});
app.listen(process.env.PORT);
