
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
loadSprite("player_ghost", "https://i.imgur.com/3BTiLtR.png")
loadSprite("border", "https://kaboomjs.com/pub/examples/img/steel.png")
loadSprite("bomb", "https://i.imgur.com/4GV5ZUa.png")
loadSprite("fire", "https://i.imgur.com/LhiUi9O.png")
loadSprite("brick", "https://i.imgur.com/DUooU1n.png")

// Extra
loadSprite("playerImmortal", "https://i.imgur.com/6ZhEJAB.png")
loadSprite("enemyImmortal", "https://i.imgur.com/G8v6fZw.png")
loadSprite("enemy", "https://i.imgur.com/QbLYNY2.png")


loadSprite("bonus_speed", "https://i.imgur.com/835sn3V.png")
loadSprite("bonus_bomb_range", "https://i.imgur.com/9mXhjIr.png")
loadSprite("bonus_bomb_amount", "https://i.imgur.com/OS6Hnu8.png")

var SERVER_ADDRESS = 'http://localhost:3000';

// Liczba tick_time * tick_number = czas przejścia z kratki na kratkę w ms
const TICK_TIME_MS = 10;
const TICK_NUMBER = 10;

async function postData(url, data) {
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
		{
			blinkChar: '|',
		},

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

	loop(0.5, () => {
		if(userText.blinkChar == ''){
			userText.blinkChar = '|';
		}
		else{
			userText.blinkChar = '';
		}
		userText.text = username + userText.blinkChar;
	});
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
				pos(this.pos.x + 80, this.pos.y + 2)
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
		"returnButton",
		returnButton(),
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
	
		socket = io.connect(SERVER_ADDRESS, connectionOptions);
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
			socket.disconnect();
			go('gameover', winner.winner);
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

function drawFire(bomb_x,bomb_y,radius){
	
	//to right
	
	for(i = 0; i <= radius; i++){
		var flag = true;
		//check if there is block
		every("zniszczalny", (obj) => {
			//console.log(obj.pos.x/11 + " == " + b.x + " // " + obj.pos.y/11 + " == " + b.y)
			if(obj.pos.x/11 == bomb_x+i && obj.pos.y/11 == bomb_y){
				flag = false;
			}
		});
		if(flag){
			//check for solid object
			every("niezniszczalny", (obj) => {
				//console.log(obj.pos.x/11 + " == " + b.x + " // " + obj.pos.y/11 + " == " + b.y)
				if(obj.pos.x/11 == bomb_x+i && obj.pos.y/11 == bomb_y){
					flag = false;
				}
			});
			if(flag){
				const p = add([
					sprite("fire"),
					"fire",
				
					pos((bomb_x+i)*11, bomb_y*11)
					//pos( player.gridPos.add(1,0))
					
				]);
				wait(1, () => {
					destroy(p);
				
				});
			}else{
				break;
			}
			
		}else{
			break;
		}

	}
	//to left
	for(i = 0; i <= radius; i++){
		var flag = true;
		//check if there is block
		every("zniszczalny", (obj) => {
			//console.log(obj.pos.x/11 + " == " + b.x + " // " + obj.pos.y/11 + " == " + b.y)
			if(obj.pos.x/11 == bomb_x-i && obj.pos.y/11 == bomb_y){
				flag = false;
			}
		});
		if(flag){
			//check for solid object
			every("niezniszczalny", (obj) => {
				//console.log(obj.pos.x/11 + " == " + b.x + " // " + obj.pos.y/11 + " == " + b.y)
				if(obj.pos.x/11 == bomb_x-i && obj.pos.y/11 == bomb_y){
					flag = false;
				}
			});
			if(flag){
				const p = add([
					sprite("fire"),
					"fire",
				
					pos( (bomb_x-i)*11, bomb_y*11)
					//pos( player.gridPos.add(1,0))
					
				]);
				wait(1, () => {
					destroy(p);
				
				});
			}else{
				break;
			}
			
		}else{
			break;
		}

		
	
		
	}
	//to top
	for(i = 0; i <= radius; i++){
		var flag = true;
		//check if there is block
		//for breakable objects
		every("zniszczalny", (obj) => {

			if(obj.pos.x/11 == bomb_x && obj.pos.y/11 == bomb_y+i){
				flag = false;
			}
		});
		if(flag){
			//check for solid object
			every("niezniszczalny", (obj) => {

				if(obj.pos.x/11 == bomb_x && obj.pos.y/11 == bomb_y+i){
					flag = false;
				}
			});
			if(flag){
				const p = add([
					sprite("fire"),
					"fire",
			
					pos( bomb_x*11, (bomb_y+i)*11)
					//pos( player.gridPos.add(1,0))
					
				]);
				wait(1, () => {
					destroy(p);
				
				});
			}else{
				break;
			}
			
		}else{
			break;
		}		
	}
	//to down
	for(i = 0; i <= radius; i++){
		var flag = true;
		//check if there is block
		every("zniszczalny", (obj) => {

			if(obj.pos.x/11 == bomb_x && obj.pos.y/11 == bomb_y-i){
				flag = false;
			}
		});
		if(flag){
			//check for solid block
			every("niezniszczalny", (obj) => {
				if(obj.pos.x/11 == bomb_x && obj.pos.y/11 == bomb_y-i){
					flag = false;
				}
			});
			if(flag){
				const p = add([
					sprite("fire"),
					"fire",
			
					pos( bomb_x*11, (bomb_y-i)*11)
					//pos( player.gridPos.add(1,0))
					
				]);
				wait(1, () => {
					destroy(p);
				
				});
			}else{
				break;
			}
			
		}else{
			break;
		}
	}
	
}




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
	loop(1, () => {
		updateTimer();
	});

	
	console.log(resp)
	layers([
		"bg",
		"obj",
		"ui",
	], "obj");
	const level = resp.map.map(e => e.join(''))
	socket.on('place bomb', (resp) => {
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
		drawFire(resp.bomb_xy.x,resp.bomb_xy.y,resp.radius);
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

		const linspace = (startValue, stopValue, cardinality) => {
			var arr = [];
			var step = (stopValue - startValue) / (cardinality - 1);
			for (var i = 0; i < cardinality; i++)
			  arr.push(startValue + (step * i));
			return arr;
		}
		const smoothMove = (player, new_xy) => {
			const x = new_xy.x;
			const y = new_xy.y;
			let x_space = linspace(player.pos.x, x * 11, TICK_NUMBER);
			let y_space = linspace(player.pos.y, y * 11, TICK_NUMBER);
			new Promise((resolve, reject)=>{
				let i = 0;
				const moveInterval = setInterval(()=>{
					if(i >= x_space.length){
						clearInterval(moveInterval);
						return;
					}
					player.pos.x = x_space[i];
					player.pos.y = y_space[i];
					++i;
				}, TICK_TIME_MS);
			});
		};

		smoothMove(p, resp.player_xy);
		// p.pos.x = resp.player_xy.x*11;
		// p.pos.y = resp.player_xy.y*11;
	});

	socket.on('remove block', (resp) => {
		resp.blocks.forEach( (b) => {
			every("zniszczalny", (obj) => {
				//console.log(obj.pos.x/11 + " == " + b.x + " // " + obj.pos.y/11 + " == " + b.y)
				if(obj.pos.x/11 == b.x && obj.pos.y/11 == b.y){
					destroy(obj);
					const p = add([
						sprite("fire"),
						"fire",
				
						pos( b.x*11, b.y*11)
						//pos( player.gridPos.add(1,0))
						
					]);
					wait(1, () => {
						destroy(p);
					});
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

	socket.on('hit player', (resp) => {
		let player = get(`player_${resp.UID}`)[0];
		console.log(resp);

		if(resp.status === 'dead'){
			destroy(player.playerText);
			destroy(player);
		}
		else if(resp.status === 'immortal'){
			player.changeSprite(username === resp.UID ? "playerImmortal" : "enemyImmortal");
			setTimeout(()=>{
				player.changeSprite(username === resp.UID ? "player" : "enemy");
			}, resp.immortal_time);
		}

		//ghost
		const ghost = add([
			sprite("player_ghost"),
			pos(player.pos.x, player.pos.y),
		]);
		const moveYto = player.pos.y-22;
		new Promise((resolve, reject)=>{
			const moveInterval = setInterval(()=>{
				if(ghost.pos.y <= moveYto){
					clearInterval(moveInterval);
					destroy(ghost);
					return;
				}
				ghost.move(0, -20)
			}, 20);
		});
				
		if(resp.UID == username){
			camShake(6);
		}
	});

	socket.on('update player statistics', (resp) => {
		//console.log(resp);
		for(let i = 0; i < resp.users.length; ++i){
			let user = resp.users[i];
			let players_stats = get("player_stats_health_" + user.UID)[0];
			players_stats.text = 'Health ' + user.lives;
			players_stats = get("player_stats_points_" + user.UID)[0];
			players_stats.text = 'Points ' + user.points;
		};
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
			"niezniszczalny"
		],
	});

	
	var temp_counter = 0;

	var height_multipler = 25;
	for (let i = 0; i < resp.users.length; ++i) {	
		let usr = resp.users[i];

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
			rect(100, height_multipler),
			pos(170, 20 + (height_multipler * temp_counter) ),
			color(239 / 255, 170 / 255, 196 / 255),
		]);
		//add user
		add([

			text("Name " + usr.UID, 4),
			pos(170 + 3, 20 + (height_multipler * temp_counter) + 2),
			"player_stats_name_"+usr.UID
		]);
		//add class 
		k.add([
			text("Class " + class_name, 4),
			pos(170 + 3, 20 + (height_multipler * temp_counter) + 7),
			"player_stats_class_"+usr.UID
		]);
		//add users health
		k.add([
			text("Health " +usr.live, 4),
			pos(170 + 3, 20 + (height_multipler * temp_counter) + 12),
			"player_stats_health_"+usr.UID
		]);
		
		//add users points
		k.add([
			text("Points " +usr.points, 4),
			pos(170 + 3, 20 + (height_multipler * temp_counter) + 17),
			"player_stats_points_"+usr.UID
		]);
		
		temp_counter++;
		console.log('start game', usr);
		add([
			pos(usr.player_xy.x * 11, usr.player_xy.y * 11),
			sprite(username === usr.UID ? "player" : "enemy"),
			"player_"+usr.UID,
			{
				speed: usr.speed,
				range: usr.bomb_range,
				health: usr.lives,
				protection: usr.immortal,
				username: usr.UID,
				points: usr.points,
				canMove: true,
				playerText: add([
					text(usr.UID, 2),
					(username === usr.UID)? color(239 / 255, 170 / 255, 196 / 255) : color(1,1,1),

				]),
				update(){
					this.playerText.pos = vec2(this.pos.x - (this.playerText.width/2) + 5.5, this.pos.y-2)
					this.resolve();
				},
				setSprite(newSprite){
					this.sprite = newSprite;
				}
			}
		])
	  }
	

	keyDown("left", () => {
		socket.emit('request_move', {direction: 'left'});
	});

	keyDown("right", () => {
		socket.emit('request_move', {direction: 'right'});
	});

	keyDown("up", () => {
		socket.emit('request_move', {direction: 'up'});
	});

	keyDown("down", () => {
		socket.emit('request_move', {direction: 'back'});
	});
	keyPress("space", () => {	
		socket.emit('request place bomb');		
	});
});





// start the game
start("login");

