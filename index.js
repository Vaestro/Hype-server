// Example express application adding the parse-server module to expose Parse
// compatible API routes.
require('dotenv').config();

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var ParseDashboard = require('parse-dashboard');

var databaseUri = process.env.DATABASE_URI;

if (!databaseUri) {
    console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
    databaseURI: databaseUri || process.env.DATABASE_URI,
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.APP_ID || 'myAppId',
    fileKey: process.env.FILE_KEY || 'myAppId',
    masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
    serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse', // Don't forget to change to https if needed

   // verbose: true,
    push:{
        ios: [
        {
            pfx: 'HypeDevCert.p12',
            bundleId:'com.hypelist.hype',
            production:false
        },
        {
            pfx: 'hypepushprodkey.p12',
            bundleId:'com.hypelist.hype',
            production:true
        }
        ]
    }

});

var dashboard = new ParseDashboard({
    "apps": [{
        "serverURL": process.env.SERVER_URL || 'http://localhost:1337/parse',
        "appId": process.env.APP_ID,
        "masterKey": process.env.MASTER_KEY,
        "javascriptKey": process.env.JAVASCRIPT_KEY,
        "restKey": process.env.REST_KEY,
        "appName": 'hype',
        production: true
    }],
    "users": [{
        "user": "hypeking",
        "pass": "theHypel1st"
    }, {
        "user": "hypeman",
        "pass": "dunningthehype"
    }]
}, true);
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// make the Parse Server available at /parse
app.use('/parse', api);

// make the Parse Dashboard available at /dashboard
app.use('/dashboard', dashboard);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
    res.status(200).send('Go away');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
    res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('hype-server running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
