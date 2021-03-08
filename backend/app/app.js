var express = require('express');
var path = require('path');
var app = express();
var http = require('http').Server(app);
// var io = require('socket.io')(http);

app.set('views', './views');
app.set('view engine', 'pug');


// https://expressjs.com/en/guide/database-integration.html
// https://docs.mongodb.com/manual/reference/method/js-collection/
var MongoClient = require('mongodb').MongoClient;
MongoClient.connect('mongodb://mongo:27017/estimates', function (err, db) {
	if (err) {
		throw err;
	}
	app.locals.dbCollection = db.collection('documents');

	app.locals.dbCollection.createIndex( { createdAt: 1 }, { expireAfterSeconds: 86400 } ); // 24 hours
});

/*io.on('connection', function(socket){
	console.log('a user connected', socket);

	socket.on('disconnect', function(){
		console.log('user disconnected', socket);
	});
});*/

// http://localhost:5813/beta/assets/room.js
app.get('/beta/assets/:asset', function (req, res) {
	var asset = req.params.asset;
	res.sendFile(path.join(__dirname + '/assets/' + asset));
});

// http://localhost:5813/beta
app.get('/beta', function (req, res) {
	res.sendFile(path.join(__dirname + '/views/room_index.html'));
});

// http://localhost:5813/beta/joinroom/123
app.post('/beta/joinroom/:room/:name', function (req, res) {
	var room = req.params.room,
		name = req.params.name,
		dbCollection = app.locals.dbCollection;

	// Create room w/o estimate
	var userEstimate = {
		createdAt: new Date(),
		room: room,
		name: name
	};

	dbCollection.find({room: room}).toArray(function (err, docs) {
		if (err) {
			res.send('NOK ' + err);
			return;
		}

		if (docs.length > 0) {
			dbCollection.updateOne({room: room, name: name}, {$set: userEstimate});
		} else {
			dbCollection.insertOne(userEstimate);
		}

		res.send('OK');
	});
});

// http://localhost:5813/beta/estimate/123/peter/5
app.post('/beta/estimate/:room/:name/:estimate', function (req, res) {
	var room = req.params.room,
		name = req.params.name,
		estimate = req.params.estimate,
		dbCollection = app.locals.dbCollection;

	// Create room w/ estimate
	var userEstimate = {
		createdAt: new Date(),
		room: room,
		name: name,
		estimate: estimate
	};

	dbCollection.find({room: room, name: name}).toArray(function (err, docs) {
		if (err) {
			res.send('NOK ' + err);
			return;
		}

		if (docs.length > 0) {
			dbCollection.updateOne({room: room, name: name}, {$set: userEstimate});
		} else {
			dbCollection.insertOne(userEstimate);
		}

		res.send('OK');
	});
});

// http://localhost:5813/beta/room/123
app.get('/beta/room/:room', function (req, res) {
	var room = req.params.room;

	res.render('estimation.pug', {room: room});
});

var globalDocs = [];
function jsonEqual(a, b) {
	return JSON.stringify(a) === JSON.stringify(b);
}

// http://localhost:5813/beta/estimates/123
app.get('/beta/estimates/:room', function (req, res) {
	var room = req.params.room,
		dbCollection = app.locals.dbCollection;

	dbCollection.find({room: room}).toArray(function (err, docs) {
		// console.log(jsonEqual(docs, globalDocs));
		// console.log(docs);
		// console.log(globalDocs);
		// console.log('----------');

		var doWeHaveNewEstimates = jsonEqual(docs, globalDocs);
		globalDocs = docs;

		if (globalDocs.length === 0) {
			res.render('emptyTable.pug');
			return;
		}

		if (doWeHaveNewEstimates) {
			res.sendStatus(304);
			return;
		}

		// Sort names alphabetically
		var estimatesSorted = docs;
		estimatesSorted.sort(function(a, b){
			if (a.name < b.name) return -1;
			if (a.name > b.name) return 1;
			return 0;
		});

		// Sort estimates from most to least
		var estimateCount = {};
		for (var i = 0, l = docs.length; i < l; i++) {
			// console.log('start', estimateCount[docs[i].estimate], docs[i].estimate);
			if (estimateCount[docs[i].estimate] === undefined) {
				estimateCount[docs[i].estimate] = 1;
				// console.log('if', estimateCount[docs[i].estimate], docs[i].estimate);
			} else {
				estimateCount[docs[i].estimate] = ++estimateCount[docs[i].estimate];
				// console.log('else', estimateCount[docs[i].estimate], docs[i].estimate);
			}
		}

		var estimateCountSorted = [];
		for (var estimate in estimateCount) {
			if (estimateCount.hasOwnProperty(estimate) && estimate !== 'undefined') {
				estimateCountSorted.push([estimate, estimateCount[estimate]]);
			}
		}
		estimateCountSorted.sort(function(a, b) {
			return b[1] - a[1];
		});

		res.render('estimateTables.pug', {estimates: estimatesSorted, estimateCount: estimateCountSorted});
	});
});

// http://localhost:5813/beta/delete/123
app.get('/beta/delete/:room', function (req, res) {
	var room = req.params.room,
		dbCollection = app.locals.dbCollection;

	if (!room) {
		res.send('No room id was sent. Quitting ...');
		return;
	}

	if (dbCollection.deleteMany({room: room})) {
		res.redirect('/beta/room/' + room);
	} else {
		res.send('Collection NOT dropped');
	}
});


http.listen(5813, function() {
	console.log('listening on *:5813');
});
