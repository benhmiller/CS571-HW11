
// You MUST have a file called "token.secret" in the same directory as this file!
// This should be the secret token found in https://dashboard.ngrok.com/
// Make sure it is on a single line with no spaces!
// It will NOT be committed.

// TO START
//   1. Open a terminal and run 'npm start'
//   2. Open another terminal and run 'npm run tunnel'
//   3. Copy/paste the ngrok HTTPS url into the DialogFlow fulfillment.
//
// Your changes to this file will be hot-reloaded!

import fetch from 'node-fetch';
import fs from 'fs';
import ngrok from 'ngrok';
import morgan from 'morgan';
import express from 'express';
import CS571 from '@cs571/mobile-client';

// Read and register with secret ngrok token.
ngrok.authtoken(fs.readFileSync("token.secret").toString().trim());

// Start express on port 53705
const app = express();
const port = 53705;

// Accept JSON bodies and begin logging.
app.use(express.json());
app.use(morgan(':date ":method :url" :status - :response-time ms'));

// "Hello World" endpoint.
// You should be able to visit this in your browser
// at localhost:53705 or via the ngrok URL.
app.get('/', (req, res) => {
  res.status(200).send(JSON.stringify({
    msg: 'Express Server Works!'
  }))
})

// Dialogflow will POST a JSON body to /.
// We use an intent map to map the incoming intent to
// its appropriate async functions below.
// You can examine the request body via `req.body`
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_request
app.post('/', (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  // A map of intent names to callback functions.
  // The "HelloWorld" is an example only -- you may delete it.
  const intentMap = {
    "HelloWorld": doHelloWorld,
    "GetWhenPosted": doLatestPost,
    "GetChatroomMessages": doGetPosts
  }

  if (intent in intentMap) {
    // Call the appropriate callback function
    intentMap[intent](req, res);
  } else {
    // Uh oh! We don't know what to do with this intent.
    // There is likely something wrong with your code.
    // Double-check your names.
    console.error(`Could not find ${intent} in intent map!`)
    res.status(404).send(JSON.stringify({ msg: "Not found!" }));
  }
})

// Open for business!
app.listen(port, () => {
  console.log(`DialogFlow Handler listening on port ${port}. Use 'npm run tunnel' to expose this.`)
})

// Your turn!
// Each of the async functions below maps to an intent from DialogFlow
// Complete the intent by fetching data from the API and
// returning an appropriate response to DialogFlow.
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_response
// Use `res` to send your response; don't return!

async function doHelloWorld(req, res) {
  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            'You will see this if you trigger an intent named HelloWorld'
          ]
        }
      }
    ]
  })
}

async function doLatestPost(req, res) {
  const chatroomName = req.body.queryResult.parameters.chatroom;
  const resp = 
    await fetch("https://cs571.org/api/f23/hw11/messages?chatroom=" + chatroomName + "&page=1", {
            headers: {
              "X-CS571-ID": "bid_b12898bda46ac66e7703c0762de9def4c784a66f024e5b5de19d6da1de871384"
            }
          });
  const respBody = await resp.json();
  const latestMessageDate = new Date(respBody.messages[0].created);
  console.log(latestMessageDate.toLocaleDateString());


  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            'The last message in ' + chatroomName + ' was posted on ' + `${latestMessageDate.toLocaleDateString()}` + 
            ' at ' + `${latestMessageDate.toLocaleTimeString()}` + '!'
          ]
        }
      }
    ]
  })
}

async function doGetPosts(req, res) {
  const chatroomName = req.body.queryResult.parameters.chatroom;

  // Calculate the number of posts to extract
  let num_posts = 0;
  if(req.body.queryResult.parameters.numMessages > 0) {
    num_posts = parseInt(req.body.queryResult.parameters.numMessages);
  }
  else {
    num_posts = 1;
  }

  // Fetch chatroom mesage from API
  const resp = 
    await fetch("https://cs571.org/api/f23/hw11/messages?chatroom=" + chatroomName + "&page=1", {
            headers: {
              "X-CS571-ID": "bid_b12898bda46ac66e7703c0762de9def4c784a66f024e5b5de19d6da1de871384"
            }
          });
  const respBody = await resp.json();

  // Extract correct number of posts
  let posts = []
  if(num_posts < 5) {
    posts = respBody.messages.slice(0, num_posts)
  }
  else {
    posts = respBody.messages.slice(0, 5)
  }

  // Construct card objects
  let cards = []
  for(let i = 0; i < posts.length; i++) {
    const card = {
      card: {
        title: posts[i].title,
        subtitle: posts[i].content,
        buttons: [
          {
            text: 'READ MORE',
            postback: 'https://cs571.org/f23/badgerchat/chatrooms/' + chatroomName + '/'
          }
        ]
      }
    }
    cards.push(card)
  }

  // Send cards to DialogFlow
  res.status(200).send({
    fulfillmentMessages: cards
  })
}