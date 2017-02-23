# ProxyServer
This proxy server was developed using node.js and has the following functions:

* Respond and handle both HTTP and HTTPS requests. 
* Dynamically blocks specified URLs via inputs to the console.
* Caches HTTP requests locally and validates cache entries.
* Can handle multiple requests simultaneously.

HTTPS requests handled using CONNECT tunneling. Removing need for a SSL Certificate and data stays encrypted throughout process.

To use: set proxy settings to send requests to port 8080.
