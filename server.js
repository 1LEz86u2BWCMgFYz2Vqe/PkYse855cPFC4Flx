require('dotenv').config();

const express = require('express');
const app = express();

const SteamTotp = require('steam-totp');
const SteamUser = require('steam-user');
const steamClient = new SteamUser();

let botT = {
  count: 0,
  sId: "",
  cookie: "",
  balance: 0,
}

const fetch = require('node-fetch');
const PostComment = async(str, ownerId, forumId, postId) => {
    const data = {
        topic_permissions: {
            can_reply: 1,
        },
    }
    const options = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': botT.cookie,
        },
        body: `comment=${encodeURIComponent(str)}&sessionid=${botT.sId}&extended_data=${JSON.stringify(data)}&feature2=${postId}`,
        method: 'POST',
    };
    try {
        const response = await fetch(`${process.env.STEAMNF2LINK}${ownerId}/${forumId}/`, options);
        const data = await response.text();
        //console.log(data);
    } catch (error) {
        console.log('Error:', error);
    }
}

const extractIdsFromString = (str) => {
    if (!str) return null;
    let data;
    try {
        data = JSON.parse(str.split('&quot;body_data&quot;:&quot;')[1].split('&quot;,&quot;read&quot;')[0].replace(/\\&quot;/g, '"'));
    } catch (e) {
        return null;
    }
    return data;
}

let answeredTopics = [];
const checkNotifs = async() => {
    setTimeout(checkNotifs, process.env.DELAY);
    const options = {
        method: 'GET',
        headers: {
            'cookie': botT.cookie,
        }
    };
    let fndNotifs = [];
    try {
        const res = await fetch(process.env.STEAMNFLINK, options);
        if (res.ok) {
            const str = await res.text();
            const match = str.match(/data-notifications="([^"]+)"/);
            if (match != null) {
                const matchRes = match[1];
                const notifs = matchRes.split(process.env.STEAMNF3LINK);
                notifs.forEach((v) => {
                    const arr = extractIdsFromString(v);
                    if (arr != null && arr.owner_steam_id != null && (arr.title != "" || arr.bis_owner === 1)) {
                        fndNotifs.push(arr);
                    }
                });
            }
        }
    } catch(e) {
        console.log(`Fetch failed`);
    } finally {
        fndNotifs.forEach(v => {
            const timeSincePost = Math.floor(Date.now() / 1e3) - Number(v.last_post);
            const cm = v.type === "10";
            const topicId = cm ? v.cgid : v.topic_id;

            if (timeSincePost <= (cm ? 3600 : 30) && !answeredTopics.includes(topicId)) {
                answeredTopics.push(topicId);
                if(cm){
                    console.log(v.text);
                    const del = new RegExp(`(${process.env.BLWORDS})`, "i").test(v.text);
                    if(del){
                        fetch(`${process.env.STEAMDEL_LINK}${process.env.STEAMID64}`, {
                            "headers": {
                                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                                "cookie": botT.cookie,
                                "Referer": "https://steamcommunity.com/my",
                            },
                            "body": `gidcomment=${topicId}&sessionid=${botT.sId}`,
                            "method": "POST"
                        });
                        console.log(`del: ${v.text}`);
                    }
                }else{
                    const responses = process.env.RESPONSES?.split('|') || [];
                    const resp = responses[Math.floor(Math.random() * responses.length)];
                    PostComment(resp, v.owner_steam_id, v.forum_id, topicId);
                }
            }
        });
    }
}

steamClient.on('webSession', (sId, cookies) => {
    (async() => {
        botT.sId = sId
        botT.cookie = cookies.join("; ");
        checkNotifs();
        console.log("Web session connected.");
    })();
});

const LogInSteam = () => {
    try {
        steamClient.logOn({
            accountName: process.env.STEAMACCNAME,
            password: process.env.STEAMPW,
            apiKey: process.env.STEAMAPIKEY,
        });
    }catch(e){
        console.log("Failed to log in");
    }
    
	let steamCode = process.env.STEAMGUARD;
    steamClient.on('steamGuard', (domain, callback) => {
		console.log("steam guard");
		if(steamCode){
			callback(steamCode);
			steamCode = null;
			console.log("trying the code");
		}else{
			console.log("no code");
		}
    });
    
    steamClient.on('loggedOn', () => {
        steamClient.setPersona(SteamUser.EPersonaState.Online);  
        steamClient.gamesPlayed([
            730,
            220,
            440,
            570,
            1422450,
            3241660,
        ])
    });  
    
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
			steamClient.gamesPlayed([
				3557620,
				570,
				220,
				730,
				440,          
			]);
		});
		steamClient.on('error', (err) => {
			console.log(`Error with account ${steamAccName}:`, err);
		});
    });
}
LogInSteam();
setInterval(() => (console.log("Restarting app"), process.exit(0)), 6 * 60 * 60 * 1e3);

app.use(express.static("public"));
app.use(express.json());

var queue = [];
app.get("/", async function(req, res) {
	res.send(queue[0]);
	queue.shift();
});
app.listen(process.env.PORT);