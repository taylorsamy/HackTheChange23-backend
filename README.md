# HackTheChange23-backend -  Node.js Calendar API Integration

## Description

This project is a backend application built with Node.js and Express. It integrates with the Google Calendar API to manage calendar events, including creating, updating, retrieving, and deleting events. The application connects to a PostgreSQL database to store event data and exposes a REST API for client-side interactions.

## Features

- **Google Calendar Integration**: Create, update, retrieve, and delete calendar events via Google API.
- **Database Integration**: Store event data in a PostgreSQL database.
- **RESTful API**: Interact with the calendar data through a set of API endpoints.

## API Endpoints

### Event Endpoints

- `GET /events`: Retrieve all events.
- `POST /events`: Update an existing event.
- `PUT /events`: Create a new event.
- `DELETE /events`: Delete an event.

#### Example Request Bodies

- **Create Event (PUT /events)**

  ```json
  {
    "summary": "Test Event",
    "description": "This is a test event",
    "start": "2023-11-11T09:00:00",
    "end": "2023-11-11T10:00:00"
  }

- **Update Event (POST /events)**

  ```json
  {
    "summary": "Test Event",
    "description": "This is a test event",
    "start": "2023-11-11T09:00:00",
    "end": "2023-11-11T10:00:00",
    "id": "5m9g4g4drl63flu3jm0aturlco"
  }

- **Delete Event (DELETE /events)**

  ```json
  {
    "id": "5m9g4g4drl63flu3jm0aturlco"
  }

### Additional Endpoints

- `GET /messages`: Retrieve all chat messages from CalPal.





