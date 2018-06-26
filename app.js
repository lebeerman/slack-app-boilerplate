require('dotenv').config();
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const port = parseInt(process.env.PORT || 4390);
const fetch = require("node-fetch");
const CronJob = require("cron").CronJob;
const app = module.exports = express();

const base_url = process.env.JOURNEY_BASE_URL;
const auth_header = process.env.JOURNEY_AUTH;
const slackbot_token = process.env.SLACK_TOKEN;

var server = http.createServer(handleRequest);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(morgan(process.env.NODE_ENV !== 'production' ? 'dev' : 'combined'));
app.use(cors({
  origin: true,
  credentials: true
}));

// TODO: ADD (MOUNT) YOUR MIDDLEWARE (ROUTES) HERE:
// Example: app.use('/api/cat', require('./routes/cat'))
// These 2 `app.use` MUST be last `.use`'s
app.use(notFound);
app.use(errorHandler);


// This route handles get request to a /oauth endpoint. 
// We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function (req, res) {
  // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. 
  // If that code is not there, we respond with an error message
  if (!req.query.code) {
    res.status(500);
    res.send({
      "Error": "Looks like we're not getting code."
    });
    console.log("Looks like we're not getting code.");
  } else {
    // If it's there...
    // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, 
    // client secret, and the code we just got as query parameters.
    request({
      url: 'https://slack.com/api/oauth.access', //URL to hit
      qs: {
        code: req.query.code,
        client_id: clientId,
        client_secret: clientSecret
      }, //Query string data
      method: 'GET', //Specify the method
    }, function (error, response, body) {
      if (error) {
        console.log(error);
      } else {
        res.json(body);
      }
    })
  }
});

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', function (req, res) {
  res.send('Your ngrok tunnel is up and running!');
});

// We create a function which handles any requests and sends a simple response
function handleRequest(request, response) {
  response.end('Ngrok is working! -  Path Hit: ' + request.url);
}

// eslint-disable-next-line
function notFound(req, res, next) {
  const url = req.originalUrl;
  if (!/favicon\.ico$/.test(url) && !/robots\.txt$/.test(url)) {
    // Don't log less important (automatic) browser requests
    console.error('[404: Requested file not found] ', url);
  }
  res.status(404).send({
    error: 'Url not found',
    status: 404,
    url
  })
}

// eslint-disable-next-line
function errorHandler(err, req, res, next) {
  console.error('ERROR', err);
  const stack = process.env.NODE_ENV !== 'production' ? err.stack : undefined;
  res.status(500).send({
    error: err.message,
    stack,
    url: req.originalUrl
  })
}


server.listen(port, function () {
  // Callback triggered when server is successfully listening. Hurray!
  console.log("Server listening on: http://localhost:%s", port);
});
// app.listen(port)
//   .on('error', console.error.bind(console))
//   .on('listening', console.log.bind(console, 'Listening on ' + port))