require('dotenv').config();
const http = require('http');
const request = require('request');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');
const port = parseInt(process.env.PORT || 4390);
const fetch = require("node-fetch");
const CronJob = require("cron").CronJob;
const app = module.exports = express();
const urlencodedParser = bodyParser.urlencoded({
  extended: false
});

const base_url = process.env.JOURNEY_BASE_URL;
const auth_header = process.env.JOURNEY_AUTH;
const slackbot_token = process.env.SLACK_TOKEN;
const clientId = process.env.SLACK_CLIENT_ID;
const clientSecret = process.env.SLACK_CLIENT_SECRET;
const slackVerification = process.env.SLACK_CLIENT_VERIFICATION;

// var server = http.createServer(handleRequest);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(morgan(process.env.NODE_ENV !== 'production' ? 'dev' : 'combined'));
app.use(cors({
  origin: true,
  credentials: true
}));

// MIDDLEWARE

app.get('/', (req, res, next) => {
  res.send('Just in the /. Lots of cleanup to do... all this tutorial boilerplate is sloppy. Ew.');
  console.log('In the base / route... try "/send-me-buttons".')
})

// This route handles get request to a /oauth endpoint. 
// We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', (req, res, next) => {
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
    }, (error, response, body) => {
      if (error) {
        console.log(error);
      } else {
        res.json(body);
      }
    })
  }
});

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', (req, res, next) => {
  res.send('POST from button click: SUCCESS. Your ngrok tunnel is up and running!');
});
app.post('/send-me-buttons', urlencodedParser, (req, res) => {
  res.status(200).end(); // best practice to respond with empty 200 status code
  var reqBody = req.body;
  var responseURL = reqBody.response_url;
  if (reqBody.token != slackVerification) {
    res.status(403).end("Access forbidden");
  } else {
    var message = {
      "text": "Would you like to play a game?",
      "attachments": [{
        "text": "Choose a game to play",
        "fallback": "You are unable to choose a game",
        "callback_id": "wopr_game",
        "color": "#434343",
        "attachment_type": "default",
        "actions": [{
            "name": "game",
            "text": "Chess",
            "type": "button",
            "value": "chess"
          },
          {
            "name": "game",
            "text": "Falken's Maze",
            "type": "button",
            "value": "maze"
          },
          {
            "name": "game",
            "text": "Thermonuclear War",
            "style": "danger",
            "type": "button",
            "value": "war",
            "confirm": {
              "title": "Are you sure?",
              "text": "Wouldn't you prefer a good game of chess?",
              "ok_text": "Yes",
              "dismiss_text": "No"
            }
          }
        ]
      }]
    };
    sendMessageToSlackResponseURL(responseURL, message);
  }
})

// REQUEST URL (Found in Slack Interactive Components) - any additional action should come from helper functions
app.post('/slack/actions', urlencodedParser, (req, res) => {
  res.status(200).end() // best practice to respond with 200 status
  var actionJSONPayload = JSON.parse(req.body.payload) // parse URL-encoded payload JSON string
  var message = {
    "text": actionJSONPayload.user.name + " clicked: " + actionJSONPayload.actions[0].name,
    "replace_original": false
  }
  console.log('ROUTE: /slack/actions',actionJSONPayload)
  sendMessageToSlackResponseURL(actionJSONPayload.response_url, message)
})

app.use(notFound);
app.use(errorHandler);

// We create a function which handles any requests and sends a simple response
function handleRequest(request, response) {
  response.end('Local ngrok is working! -  Path Hit: ' + request.url);
}

function sendMessageToSlackResponseURL(responseURL, JSONmessage) {
  var postOptions = {
    uri: responseURL,
    method: 'POST',
    headers: {
      'Content-type': 'application/json'
    },
    json: JSONmessage
  }
  request(postOptions, (error, res, body) => {
    if (error) {
      // handle errors as you see fit
        res.status(404).send({
          error: 'Url not found',
          status: 404,
          error
        })
    }
  })
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
  });
}

// eslint-disable-next-line
function errorHandler(err, req, res, next) {
  console.error('ERROR', err);
  const stack = process.env.NODE_ENV !== 'production' ? err.stack : undefined;
  res.status(500).send({
    error: err.message,
    stack,
    url: req.originalUrl
  });
}


// server.listen(port, function () {
//   // Callback triggered when server is successfully listening. Hurray!
//   console.log("Server listening on: http://localhost:%s", port);
// });
app.listen(port)
  .on('error', console.error.bind(console))
  .on('listening', console.log.bind(console, 'Listening on ' + port))
