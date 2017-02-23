//Module dependencies.
var http = require('http');
var express = require('express');  
var request = require('request');
var url = require("url");
var net = require('net');
var streamBuffers = require('stream-buffers');
var stdin = process.openStdin();
var moment = require('moment');


moment().format();
var cacheBody = {};  //Contains cached response body
var cacheHead = {};  //Contains cached response content-type from header
var cacheTime = {};	 //Contains cached timestamp of req
var blockedTable= {}; //Contains all urls that're blocked
var app = express();  

//HTTP Requests
try{
	//For all HTTP Requests (App is Express object used for routing)
	app.all('*', function(req, res) {  
		//Get url of request
		var url =  req.url;
		//Check if url is blocked
		if(blockedTable[url]!=null){
			console.log("This url has been blocked ",url);
			res.status(403).send('403 Forbidden');
		}
		else{
			//Only Get requests are cached
			if(req.method=='GET'){
				console.log("Proxying HTTP request for:",url);
				//Check if url has been cached and if that entry is valid
				if(cacheBody[url]!=null&&checkEntryValid(url)){
					console.log('Cache Hit:',url);
					//Set Headers of response from cache
					res.writeHead(200, {'Content-Type':cacheHead[url]});
					//Send the cached resBody to browser
					res.write(cacheBody[url]);
					res.end();
				}
				else{
					//Create buffer to hold all data chunks being received from website
					var buffer = new streamBuffers.WritableStreamBuffer();
					request
					.get(url)
					//When received response from website
					.on('response', function(response) {
						//Strip content type from header, update cache
						cacheHead[url]= response.headers['content-type'];
						cacheTime[url]= response.headers['date'];
					})
					//When data received add to buffer
					.on('data', function(data) {
						buffer.write(data);
					})
					//When FIN received update cache with buffer contents
					.on('end', function(data) {
						cacheBody[url]=buffer.getContents();
					})
					//Send response onto browser
					.pipe(res,{end:true});
				}
			}
			//If request isnt a GET 
			// => Handle the request without caching.
			else{
				var response=req.pipe(request(url), {end:true});
				response.pipe(res,{end:true});
			}
		}
	});
}
catch(er){
	console.log('Error Caught');
}

//Create the proxy server and listen on port 8080
var httpServer=http.createServer(app);
httpServer.listen(8080,function(){
	console.log('Proxy listening on port 8080');
});
//HTTPS Requests

//Listen for connect request from browser
//reqBody is encrypted
httpServer.addListener('connect', function (req, socket, reqBody) {
	var urlDetails = getDomainFromUrl(req.url, 443);
	var hostDomain = urlDetails[0];
	var port = parseInt(urlDetails[1]);
	//Check if url has been blocked
	if(blockedTable[hostDomain]!=null){
		//If blocked send 403 
		console.log("This url has been blocked ",hostDomain);
		socket.write("HTTP/" + req.httpVersion + " 403 Forbidden\r\n\r\n");
		socket.end();
	}
	else{
		console.log("Proxying HTTPS request for:", hostDomain, 'on port: ', port);
		//Get free socket and attempt to connect to dest server on that socket
		var proxySocket = new net.Socket();
		proxySocket.connect(port, hostDomain, function () {
			//Write req body to the dest server
			proxySocket.write(reqBody);
			//Send 200 Connection established success msg back to browser
			socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
		}
		);
		//When dest server sends data to proxy send it onto the browser
		proxySocket.on('data', function (data) {
			socket.write(data);

		});
		//When website sends FIN packet close socket with browser
		//To allow more req
		proxySocket.on('end', function () {
			socket.end();
			proxySocket.end();
		});

		//If error occurs send 500 connection error back to the browser and end connection
		proxySocket.on('error', function () {
			socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
			socket.end();
		});

		//When browser sends data to proxy send it onto dest server
		socket.on('data', function (data) {
			proxySocket.write(data);

		});

		//When browser sends FIN to proxy end connection with dest server
		//Connection with browser is left open for future requests.
		socket.on('end', function () {
			socket.end();
			proxySocket.end();
		});

		//If browser sends error then end connection with dest server
		socket.on('error', function () {
			proxySocket.end();
		});
	}
});

//Constant used for string manipulation
var regex_hostport = /^([^:]+)(:([0-9]+))?$/;

//Get domain and port from the request url
var getDomainFromUrl = function (url, defaultPort) {
	var host = url;
	var port = defaultPort;
	//result will contain {domain,:port, port}
	var result = regex_hostport.exec(url);
	if (result != null) {
		host = result[1];
		if (result[2] != null) {
			port = result[3];
		}
	}
	return ( [host, port] );
};

var checkEntryValid = function (url){
	//Create moment from cachedTime entry
	var entryTimestamp = moment(cacheTime[url]);
	//Get current timestamp
	var now = moment();
	//Get age of cache entry in seconds
	var diff= now.diff(entryTimestamp,'seconds');
	//If older than 20 seconds then mark as stale and void entries
	//*20 seconds is purely for ease of testing & demonstrating
	if(diff>10000000){
		cacheTime[url]=null;
		cacheHead[url]=null;
		cacheBody[url]=null;
		console.log('Cache hit but stale')
		return false;
	}
	return true;
};

//Listener for inputs to the console. Called when a something has been entered.
stdin.addListener("data", function(url) {
	//Get String of data entered
	var bUrl=url.toString().trim();
	if(blockedTable[bUrl]){
		blockedTable[bUrl]=null;
		console.log( bUrl +' has been deleted from blocked list');
	}
	else{
		console.log( bUrl +' has been added to blocked list');
		//Set table entry as true to signify url is blocked.
		blockedTable[bUrl]=true;
	}

});