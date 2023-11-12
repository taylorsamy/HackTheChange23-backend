const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { Client } = require('pg');
const express = require('express');
const cors = require('cors')

// load environment variables
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

const COLOURS = ['56c8b5', 'c15854', 'b5a0e1'];


/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listGEvents(auth) {
  eventsList = [];

  const today = new Date();
  today.setHours(0,0,0,0);

  const calendar = google.calendar({version: 'v3', auth});
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: today,
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime',
  });
  const events = res.data.items;
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  events.map((event, i) => {
    const start = event.start.dateTime || event.start.date;    
    // only get events that are in the next 7 days
    // get today at midnight
    
    console.log(today + ' is today');
    const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate()+7);

    // console.log(event.summary)

    if (new Date(start) >= today && new Date(start) <= nextWeek) {
      // console.log(`${start} - ${end} -- ${event.summary}`);
      // console.log(event);
      console.log(event.summary)
      eventsList.push(event);
    }



    // if (start.substring(0,10) == new Date().toISOString().substring(0,10)) {
    //   // console.log(`${start} - ${end} -- ${event.summary}`);
    //   // console.log(event);
    //   eventsList.push(event);
    // }

    
  });

  return eventsList;
}

async function createGEvent(eventName, eventDescription, eventStartTime, eventEndTime) {
  auth = await authorize();
  const calendar = google.calendar({version: 'v3', auth})
  const event = {
    'summary': eventName,
    // 'location': '800 Howard St., San Francisco, CA 94103',
    'description': eventDescription,
    'start': {
      'dateTime': eventStartTime,
      'timeZone': 'America/Edmonton',
    },
    'end': {
      'dateTime': eventEndTime,
      'timeZone': 'America/Edmonton',
    },
    // 'attendees': [
    //   {'email': 'lpage@example.com'},
    //   {'email': 'sbrin@example.com'},
    // ],

  };

  calendar.events.insert({
    auth: auth,
    calendarId: 'primary',
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event created: %s', event.data.htmlLink);
  });

}


async function updateGEvent(eventName, eventDescription, eventStartTime, eventEndTime, eventId) {
  auth = await authorize();
  const calendar = google.calendar({version: 'v3', auth})

  const event = {
    'summary': eventName,
    // 'location': '800 Howard St., San Francisco, CA 94103',
    'description': eventDescription,
    'start': {
      'dateTime': eventStartTime,
      'timeZone': 'America/Edmonton',
    },
    'end': {
      'dateTime': eventEndTime,
      'timeZone': 'America/Edmonton',
    },
    // 'attendees': [
    //   {'email': 'lpage@examplecom'},
    //   {'email': 'sbrin@examplecom'},
    // ],

  };

  calendar.events.update({
    auth: auth,
    calendarId: 'primary',
    eventId: eventId,
    resource: event,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event updated: %s', event.data.htmlLink);
  });

}

async function deleteGEvent(eventId) {
  auth = await authorize();
  const calendar = google.calendar({version: 'v3', auth})
  console.log("deleting event")
  console.log(eventId)

  calendar.events.delete({
    auth: auth,
    calendarId: 'primary',
    eventId: eventId,
  }, function(err, event) {
    if (err) {
      console.log('There was an error contacting the Calendar service: ' + err);
      return;
    }
    console.log('Event deleted');
  });

}

// set up database connection to postgres db

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DB_DBNAME
});

client.connect();


async function insertEvent(event) {
  console.log("inserting event")
  event.start.dateTime = event.start.dateTime.substring(0, event.start.dateTime.length - 6);
  event.end.dateTime = event.end.dateTime.substring(0, event.end.dateTime.length - 6);

  // get random colour
  const colour = COLOURS[Math.floor(Math.random() * COLOURS.length)];
  


  const query = {
    text: 'INSERT INTO calendar_events (id, kind, etag, status, htmlLink, created, updated, summary, description, creator_email, creator_self, organizer_email, organizer_self, start_dateTime, start_timeZone, end_dateTime, end_timeZone, iCalUID, sequence, useDefault, eventType, attendees, hangoutLink, conferenceData, conferenceId,colour) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)',
    values: [event.id, event.kind, event.etag, event.status, event.htmlLink, event.created, event.updated, event.summary, event.description, event.creator.email, event.creator.self, event.organizer.email, event.organizer.self, event.start.dateTime, event.start.timeZone, event.end.dateTime, event.end.timeZone, event.iCalUID, event.sequence, event.useDefault, event.eventType, JSON.stringify(event.attendees), event.hangoutLink, JSON.stringify(event.conferenceData), event.conferenceId, colour],
  }
  try {
    client.query(query);
  } catch (err) {
    console.log(err.stack);
  }
}

async function updateEvent(event) {
  console.log("updating event")
  // remove -07:00 from end of date time
  event.start.dateTime = event.start.dateTime.substring(0, event.start.dateTime.length - 6);
  event.end.dateTime = event.end.dateTime.substring(0, event.end.dateTime.length - 6);
  const query = {
    text: 'UPDATE calendar_events SET kind = $2, etag = $3, status = $4, htmlLink = $5, created = $6, updated = $7, summary = $8, description = $9, creator_email = $10, creator_self = $11, organizer_email = $12, organizer_self = $13, start_dateTime = $14, start_timeZone = $15, end_dateTime = $16, end_timeZone = $17, iCalUID = $18, sequence = $19, useDefault = $20, eventType = $21, attendees = $22, hangoutLink = $23, conferenceData = $24, conferenceId = $25 WHERE id = $1',
    values: [event.id, event.kind, event.etag, event.status, event.htmlLink, event.created, event.updated, event.summary, event.description, event.creator.email, event.creator.self, event.organizer.email, event.organizer.self, event.start.dateTime, event.start.timeZone, event.end.dateTime, event.end.timeZone, event.iCalUID, event.sequence, event.useDefault, event.eventType, JSON.stringify(event.attendees), event.hangoutLink, JSON.stringify(event.conferenceData), event.conferenceId],
  }
  try {
    client.query(query);
  } catch (err) {
    console.log(err.stack);
  }
}

async function deleteEvent(event) {
  console.log("deleting event " + event.id + " from database")
  const query = {
    text: 'DELETE FROM calendar_events WHERE id = $1',
    values: [event.id],
  }
  try {
    client.query(query);
  } catch (err) {
    console.log(err.stack);
  }
}

async function getEvent(event) {
  console.log("getting event " + event.id + " from database")

  const query = {
    text: 'SELECT id,creator_email FROM calendar_events WHERE id = $1',
    values: [event.id],
  }
  try {
    // run the query and return the first row
    const records = await client.query(query);
    // console.log(records.rows[0]);
    return records.rows[0];
    
  } catch (err) {
    console.log(err.stack);
  }
}

async function getEvents() {
  const query = {
    text: 'SELECT * FROM calendar_events',
  }
  try {
    const records = await client.query(query);
    // console.log(records.rows);
    return records.rows;
  } catch (err) {
    console.log(err.stack);
  }
}

async function syncEvents() {

  auth = await authorize();
  events = await listGEvents(auth);

  console.log("syncing events")
  // console.log(events)
  
  // loop through events
  if (!events || events.length === 0) {
    console.log('No upcoming events found.');
    return;
  }
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const existingEvent = await getEvent(event);
    if (existingEvent) {
      // console.log("event exists")
      // console.log(existingEvent)
      // update event
      await updateEvent(event);
    } else {
      // console.log("event does not exist")
      // console.log(event)
      // insert event
      await insertEvent(event);
    }
  }

}

async function getMessages() {
  const query = {
    text: 'SELECT timestamp, "fromUser", content FROM messages'
  }
  try {
    const records = await client.query(query);
    // console.log(records.rows);
    return records.rows;
  } catch (err) {
    console.log(err.stack);
  }
}

const app = express();
app.use(express.json());
app.use(cors());
const port = 3000;

app.get('/messages', async (req, res) => {

  const messages = await getMessages();

  res.send(messages);

} );


app.get('/events', async (req, res) => {

  // sync events with google calendar
  await syncEvents();

  // get events from database
  const events = await getEvents();
  res.send(events);;

} );

app.put('/events', async (req, res) => {
  // get event from request body
  console.log(req.body);

  // sample body
  // {
  //   "summary": "Test Event",
  //   "description": "This is a test event",
  //   "start": "2021-03-23T20:00:00.000Z",
  //   "end":"2021-03-23T20:00:00.000Z",
  // }

  req.body.start = req.body.start + "-07:00";
  req.body.end = req.body.end + "-07:00";
  await createGEvent(req.body.summary, req.body.description, req.body.start, req.body.end);
  // delay to allow google calendar to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  await syncEvents();
  
  res.send("ok");
} );

app.post('/events', async (req, res) => {
  // get event from request body
  console.log(req.body);

  // sample body
  // {
  //   "summary": "Test Event",
  //   "description": "This is a test event",
  //   "start": "2021-03-23T20:00:00",
  //   "end":"2021-03-23T20:00:00",
  //   "id": "testid"
  // }

  req.body.start = req.body.start + "-07:00";
  req.body.end = req.body.end + "-07:00";
  
  await updateGEvent(req.body.summary, req.body.description, req.body.start, req.body.end, req.body.id);
  // delay to allow google calendar to update
  await new Promise(resolve => setTimeout(resolve, 1000));

  await syncEvents();

  res.send("ok");
} );

app.delete('/events', async (req, res) => {
  // get event from request body

  // sample body
  // {
  //   "id": "testid"
  // }

  // delete event in google calendar
  await deleteGEvent(req.body.id);
  // delay to allow google calendar to update
  await new Promise(resolve => setTimeout(resolve, 1000));
  await syncEvents();

  await deleteEvent(req.body);

  res.send("ok");

} );


app.listen(port, () => console.log(`CalPal listening on port ${port}!`));
