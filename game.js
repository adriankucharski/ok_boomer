
const k = kaboom({
	global: true,
	fullscreen: true,
	debug: true,
	scale: 5,
	clearColor: [0, 0, 0, 1]
});
var socket = null;

/*
var ws = new WebSocket("ws://localhost:3000/");

ws.onopen = function () {

	// Web Socket is connected, send data using send()
	ws.send("Message to send");
	alert("Message is sent...");
};

ws.onmessage = function (evt) {
	var received_msg = evt.data;
	alert("Message is received...");
};

ws.onclose = function () {

	// websocket is closed.
	alert("Connection is closed...");
};

*/
loadSprite("player", "https://kaboomjs.com/pub/examples/img/guy.png")
loadSprite("border", "https://kaboomjs.com/pub/examples/img/steel.png")
loadSprite("bomb", "https://i.imgur.com/4GV5ZUa.png")
loadSprite("fire", "https://i.imgur.com/LhiUi9O.png")
loadSprite("brick", "https://i.imgur.com/DUooU1n.png")

loadSprite("bonus_speed", "https://i.imgur.com/835sn3V.png")
loadSprite("bonus_bomb_range", "https://i.imgur.com/9mXhjIr.png")
loadSprite("bonus_bomb_amount", "https://i.imgur.com/OS6Hnu8.png")

var SERVER_ADDRESS = 'http://localhost:3000';

async function postData(url, data) {
	console.log(data);
	// Default options are marked with *
	const response = await fetch(url, {
		method: 'POST', // *GET, POST, PUT, DELETE, etc.
		mode: 'cors', // no-cors, *cors, same-origin
		cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
		credentials: 'same-origin', // include, *same-origin, omit
		headers: {
			'Content-Type': 'application/json'
			// 'Content-Type': 'application/x-www-form-urlencoded',
		},
		redirect: 'follow', // manual, *follow, error
		referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
		body: JSON.stringify(data)
	});
	return response.json(); // parses JSON response into native JavaScript objects
}




// define a scene
scene("login", () => {
	var username = "";

	const helloSing = add([
		text("Witaj, podaj swoj nick:", 6),
		pos(20, 20),
	]);

	const ErrorMessage = add([
		text("", 4),
		pos(20, 80),
		color(255 / 255, 0, 0)
	]);

	const userText = add([
		text(username, 6),
		color(239 / 255, 170 / 255, 196 / 255),
		pos(20, 30),

		charInput((ch) => {
			username += ch;
			userText.text = username;
		}),

		keyPress("backspace", () => {
			username = username.slice(0, -1);
			userText.text = username;
		}),

		keyPress("enter", () => {
			let response = postData(SERVER_ADDRESS + '/login', { UID: username });
			response.then(function (result) {
				if (result.status == 1) {
					ErrorMessage.text = "This username is already taken";
				}
				else if (result.status == 0) {
					go("menu", username, result.classes);
				}
			})


		})
	]);
});
scene("waiting", () => {
	var i = 0;
	const waitText = add([
		text("Czekam na graczy"),
		pos(20, 20)
	]);
	loop(0.2, () => {
		i++;
		if(i > 3) i = 0;
		let t = "Czekam na graczy";
		for(let j=0; j<i; j++){
			t += '.';
		}
		waitText.text = t;
	});
});

//define return to login button
function returnButton() {

	return {
		update() {
			if (this.isHovered()) {
				this.color = rgb(210 / 255, 140 / 255, 170 / 255);
			} else {
				this.color = rgb(239 / 255, 170 / 255, 196 / 255);
			}
			
		},
		add() {
			//add onClick handle
			this.clicks(() => {
				go("login");
			});
			
			k.add([
				text('New game', 4),
				pos(this.pos.x + 100, this.pos.y + 2)
			]);
		}
	}
}



scene('gameover', winner => {
	add([
		text("Gratulacje, " + winner),
		pos(20, 20)
	])
	add([
		rect(200, 10),
		pos(20, 50 ),
		color(239 / 255, 170 / 255, 196 / 255),
		"button",
		button(),
	]);
})
scene("menu", (username, classes) => {
	const helloUser = add([
		text("Witaj " + username + ". Wybierz klase:", 6),
		pos(5, 5),
	]);

	function socketInit(button) {
		var connectionOptions = {
			"force new connection": true,
			"reconnectionAttempts": "Infinity",
			"timeout": 10000,
			"transports": ["websocket"]
		};
	
		socket = io.connect('http://localhost:3000', connectionOptions);
		socket.on('connect', () => {
			console.log("Connected as " + username + " (CLASS_ID: " + button.class.class_id + ")")
			socket.emit('login', { UID: username, class_id: button.class.class_id });
			socket.on('loggedIn', (resp) => {
				go('waiting');
			});
			socket.on('start game', (resp) => {
				go("main", resp, username);
			});

		});
		socket.on('game over', (winner) => {
			go('gameover', winner);
		})
	}

	//degine button lifecycle
	function button() {

		return {
			update() {
				if (this.isHovered()) {
					this.color = rgb(210 / 255, 140 / 255, 170 / 255);
				} else {
					this.color = rgb(239 / 255, 170 / 255, 196 / 255);
				}
				
			},
			add() {
				//add onClick handle
				this.clicks(() => {
					socketInit(this)
				});
				//add class name
				k.add([
					text(this.class.class_name, 4),
					pos(this.pos.x + 3, this.pos.y + 2)
				]);
				//add class description
				k.add([
					text('Description: ' + this.class.description, 4),
					pos(this.pos.x + 3, this.pos.y + 7),
				]);
			}
		}
	}

	//foreach in classes, create button
	for(let i = 0; i < classes.length; i++){
		add([
			rect(200, 13),
			pos(25, 20 + (18 * i) ),
			color(239 / 255, 170 / 255, 196 / 255),
			"button",
			button(),
			{
				class: classes[i]
			},
	
		]);
	}
	
});

var global_date;


function updateTimer(){
	let p = get("timer")[0];
	var temp_date = new Date().getTime();
	var seconds = parseInt((temp_date-global_date)/1000,0);
	var min_dif = parseInt(seconds/60,0);
	var sec_dif = parseInt(seconds-(min_dif*60),0);
	
	if(min_dif < 10){
		if(sec_dif < 10)
			p.text = '0'+min_dif+':'+'0'+sec_dif;
		else
			p.text = '0'+min_dif+':'+sec_dif;
		
	}else{
		if(sec_dif < 10)
			p.text = min_dif+':'+'0'+sec_dif;
		else
			p.text = min_dif+':'+sec_dif;
		
	}
	
}

scene("main", (resp, username) => {
	
	//timer
	
	global_date = new Date().getTime();
	add([
		rect(25, 8),
		pos(170, 5),
		color(239 / 255, 170 / 255, 196 / 255),
		
	]);
	add([
		text("", 4),
		pos(170 + 3, 5 + 2),
		"timer"
	]);
	updateTimer();
	setInterval(updateTimer, 1000);

	
	console.log(resp)
	layers([
		"bg",
		"obj",
		"ui",
	], "obj");
	const level = resp.MAP.map(e => e.join(''))
	socket.on('place bomb', (resp) => {
		console.log("BOMB !" + resp)
		const bomb = add([
			sprite("bomb"),
			layer("bg"),
			"bomb_"+resp.bomb_xy.x+"_"+resp.bomb_xy.y,
			pos(resp.bomb_xy.x*11, resp.bomb_xy.y*11),
		]);
		
	});
	socket.on('place explode', (resp) =>{
		//
		let bomb = get("bomb_"+resp.bomb_xy.x+"_"+resp.bomb_xy.y)[0];
		destroy(bomb);
	});

	socket.on('place bonus', (resp) =>{
		if(resp.bonus_type == "speed"){
			add([
				sprite("bonus_speed"),
				scale(0.33),
				layer("bg"),
				"bonus",
				pos(resp.bonus_xy.x*11, resp.bonus_xy.y*11),
			]);

		}
		if(resp.bonus_type == "bomb_range"){
			add([
				sprite("bonus_bomb_range"),
				scale(0.33),
				layer("bg"),
				"bonus",
				pos(resp.bonus_xy.x*11, resp.bonus_xy.y*11),
			]);

		}
		if(resp.bonus_type == "bomb amount"){
			add([
				sprite("bonus_bomb_amount"),
				scale(0.33),
				layer("bg"),
				"bonus",
				pos(resp.bonus_xy.x*11, resp.bonus_xy.y*11),
			]);

		}
	});

	socket.on('move player', (resp) => {
		//console.log("MOVE" + JSON.stringify(resp))
		let p = get("player_" + resp.UID)[0];
		
		p.pos.x = resp.player_xy.x*11;
		p.pos.y = resp.player_xy.y*11;
		
		
	});

	socket.on('remove block', (resp) => {
		console.log(resp);
		resp.blocks.forEach( (b) => {
			every("zniszczalny", (obj) => {
				//console.log(obj.pos.x/11 + " == " + b.x + " // " + obj.pos.y/11 + " == " + b.y)
				if(obj.pos.x/11 == b.x && obj.pos.y/11 == b.y){
					destroy(obj);
				}
			});
		});
	});
	
	socket.on('remove bonus', (resp) => {
		every("bonus", (obj) => {
			if(obj.pos.x/11 == resp.bonus_xy.x && obj.pos.y/11 == resp.bonus_xy.y){
				destroy(obj);
			}
		});

	});

	socket.on('update player statistics', (resp) => {
		console.log(resp);
		resp.users.forEach((u)=>{
			let players_stats = get("player_stats_health_" + u.UID)[0];
			players_stats.text = u.lives;

			players_stats = get("player_stats_points_" + u.points)[0];
			players_stats.text = u.points;
		})
	});

	const map = addLevel(level, {
		width: 11,
		height: 11,
		pos: vec2(0, 0),
		"2": [
			sprite("border"),
			solid(),
			"zniszczalny"


		],
		"1": [
			sprite("brick"),
			solid(),
			

		],

	});

	
	var temp_counter = 0;
	for (const u in resp.USERS) {
	
		let usr = resp.USERS[u];
		//name of class by name
		var class_name;
		if(usr.class=='1')
			class_name='Zwinne nogi';
		else if(usr.class=='2')
			class_name='Bomber';
		else if(usr.class=='3')
			class_name='Medyk';
		else
			class_name = "Rage Bomber";
		//container
		add([
			rect(100, 25),
			pos(170, 20 + (25 * temp_counter) ),
			color(239 / 255, 170 / 255, 196 / 255),
		]);
		//add user
		add([
			text(u, 4),
			pos(170 + 3, 20 + (25 * temp_counter) + 2),
			"player_stats_name_"+u
		]);
		//add class 
		k.add([
			text(class_name, 4),
			pos(170 + 3, 20 + (25 * temp_counter) + 7),
			"player_stats_class_"+u
		]);
		//add users health
		k.add([
			text("Health " +usr.live, 4),
			pos(170 + 3, 20 + (25 * temp_counter) + 12),
			"player_stats_health_"+u
		]);
		
		//add users points
		k.add([
			text("Points " +usr.points, 4),
			pos(170 + 3, 20 + (25 * temp_counter) + 17),
			"player_stats_points_"+u
		]);
		
		temp_counter++;
		console.log(usr);
		add([
			pos(usr.player_xy[0] * 11, usr.player_xy[1] * 11),
			sprite("player"),
			"player_"+u,
			{
				speed: usr.speed,
				range: usr.bomb_range,
				health: usr.lives,
				protection: usr.immortal,
				username: u,
				points: usr.points,
				canMove: true,
				playerText: add([
					text(u, 2),
				]),
				update(){
					this.playerText.pos = vec2(this.pos.x - (this.playerText.width/2) + 5, this.pos.y-2)
					this.resolve();
				}
			}
		])
	  }
	
	const player = get("player_" + username)[0];
	console.log("player_"+username +":"+ player.range);


	keyDown("left", () => {

			socket.emit('request_move', {direction: 'left'});

		
	});

	keyDown("right", () => {

			socket.emit('request_move', {direction: 'right'});

	});

	keyDown("up", () => {
		if(player.canMove){
			player.canMove = false;
			socket.emit('request_move', {direction: 'up'});
			wait(0.2, () => {
				player.canMove = true;
			});
		}
	});

	keyDown("down", () => {
		if(player.canMove){
			player.canMove = false;
			socket.emit('request_move', {direction: 'back'});
			wait(0.2, () => {
				player.canMove = true;
			});
		}
	});
	keyPress("space", () => {	
		socket.emit('request place bomb');		
	});
	// player.collides("fire", (a) => {
	// 	if (!player.protection) {
	// 		player.protection = true;
	// 		player.health--;
	// 		camShake(12);
	// 		if (player.health < 1) {
	// 			destroy(player);
	// 			destroy(userText);
	// 		}

	// 		wait(1, () => {
	// 			player.protection = false;
	// 		});

	// 	}

	// });

	//const stats = add([
	//	text(`Health: ${player.health}`, 3),
	//	pos(150, 4),
	//]);

});





// start the game
start("login");

