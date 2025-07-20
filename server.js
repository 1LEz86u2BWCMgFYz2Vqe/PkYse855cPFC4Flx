require('dotenv').config();

const express = require('express');
const app = express();

const SteamTotp = require('steam-totp');
const SteamUser = require('steam-user');
const steamClient = new SteamUser();

const LogInSteam = () => {
    console.log("logging in steam");
}
LogInSteam();

app.use(express.static("public"));
app.use(express.json());

var queue = [];
app.get("/", async function(req, res) {
	res.send(queue[0]);
	queue.shift();
});
app.listen(process.env.PORT);