# ProxyServer
Local proxy server with intent of tracking and decreasing internet usage through caching.
Developed using node.js with the following functions:

* Respond and handle both HTTP and HTTPS requests. 
* Dynamically blocks specified URLs via inputs to the console.
* Caches HTTP requests locally and validates cache entries.
* Can handle multiple requests.

HTTPS requests handled using CONNECT tunneling. Removing need for a SSL Certificate and data stays encrypted throughout process.

## Usage
Set browser proxy settings to send requests to port 8080.

To install project dependencies: 
```
npm install
```

To run proxy:
```
node proxy.js
```

To block URL enter the url into the console.
```
https://github.com
```
