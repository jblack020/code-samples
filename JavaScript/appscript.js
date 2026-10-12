function getAvailableRooms(eventDetails) {
    // Prepare the payload in the format expected by your Flask server
    var payload = {
      'times': eventDetails.times,
      'dates': eventDetails.dates,
      'end_times': eventDetails.end_times,
      'end_date': eventDetails.end_date
    };
  
    // Prepare the options for the fetch command
    var options = {
      'method': 'post',
      'contentType': 'application/x-www-form-urlencoded',
      'payload': payload
    };
  
    // Get the response from the Heroku server via Flask 
    var response = UrlFetchApp.fetch('https://safe-spire-91577-4a41aef00235.herokuapp.com/check-availability', options);
  
    // Parse the JSON response
    var jsonResponse = JSON.parse(response.getContentText());
    
    // Now 'rooms' is expected to be a dictionary
    var rooms = jsonResponse.results;
  
    // Get the rooms
    var roomNumbers = Object.keys(rooms); 
    var lastTimes = Object.values(rooms);
  
    return [roomNumbers, lastTimes]; 
  }
  
  function onEventOpen(e) {
    // Create the card
    var card = CardService.newCardBuilder();
    card.setHeader(CardService.newCardHeader().setTitle("Book a Room"));
  
    // Grab the start time of the event
    var event;
    try {
      event = Calendar.Events.get(e.calendar.calendarId, e.calendar.id);
    }
    catch(e){
      var card = CardService.newCardBuilder();
  
      // Create a new section
      var section = CardService.newCardSection();
  
      // Create a new text paragraph widget with the desired message
      var textParagraph = CardService.newTextParagraph()
        .setText("<b><font size='+3' align='center'>Please choose a valid event. Please note that we cannot check availability for events that are still being created. If you believe this to be the case, please create the event first, then check back.</font></b>");
  
      // Add the text paragraph to the section
      section.addWidget(textParagraph);
  
      // Add the section to the card
      card.addSection(section);
  
      // Build the card and return it
      return card.build();
    }
    
    // Prepare eventDetails
    var eventDetails = {
      dates: formatDater(new Date(event.start.dateTime)),
      times: formatTime(new Date(event.start.dateTime)),
      end_times: formatTime(new Date(event.end.dateTime)),
      end_date: formatDater(new Date(event.end.dateTime))
    };
  
    // Get available rooms and store in user properties
    var both = getAvailableRooms(eventDetails);
    rooms = both[0];
    last_times = both[1];
    
    if(rooms.length === 0) {
      var card = CardService.newCardBuilder();
  
      // Create a new section
      var section = CardService.newCardSection();
  
      // Create a new text paragraph widget with the desired message
      var textParagraph = CardService.newTextParagraph()
        .setText("<b><font size='+3' align='center'>Sorry, there are no rooms in Cabot Library available for this specific time. Please try a different time.</font></b>");
  
      // Add the text paragraph to the section
      section.addWidget(textParagraph);
  
      // Add the section to the card
      card.addSection(section);
  
      // Build the card and return it
      return card.build();
    }
  
    // Create an object with key value pairs for room name and URL
    var roomImages = {
      "202": "https://i.imgur.com/TUhg02m.png", 
      "210": "https://i.imgur.com/DgbIRW3.png",
      "211": "https://i.imgur.com/R2uMiWn.png",
      "212": "https://i.imgur.com/KHON3fC.png",
      "213": "https://i.imgur.com/xKcqkGs.png",
      "214": "https://i.imgur.com/BSjEYoy.png",
      "LL05": "https://i.imgur.com/4x5bvJm.png",
      "LL06": "https://i.imgur.com/rMNhhQW.png",
      "LL07": "https://i.imgur.com/gi6PIGg.png",
      "LL08": "https://i.imgur.com/Ugk5aiQ.png",
      "LL09": "https://i.imgur.com/4JBVbPc.png",
      "LL10": "https://i.imgur.com/qgQiAqU.png"
    };
  
    // Populate dropdown with available rooms
    for (var i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      var lastTime = last_times[i];
      var imageUrl = roomImages[room]; // Assuming roomImages is a predefined dictionary of image URLs
      var startTime = eventDetails.times;
  
      var section = createRoomBookingCard(imageUrl, room, lastTime, startTime);
      card.addSection(section);
    }
  
    var names = getCurrentUserName().split(' ');
    var first_name = names[0];
    var last_name = names.length > 1 ? names[names.length - 1] : "";
    var email = Session.getActiveUser().getEmail();
  
    var roomBook = {
      'email_address': email,
      'first_name': first_name,
      'last_name': last_name,
      'times': eventDetails.times,
      'dates': eventDetails.dates,
      'end_times': eventDetails.end_times,
      'end_date': eventDetails.end_date,
      'event': event,
      "calendarId": e.calendar.calendarId,
      "eventId": e.calendar.id
    };
  
    var scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty('roomBook', JSON.stringify(roomBook));
  
    return card.build();
  }
  
  function createRoomBookingCard(url, room, last_time, start_time) {
    
    // Add the header image
    var imageWidget = CardService.newImage()
        .setImageUrl(url) // Make sure to replace with your actual image URL
        .setAltText('Room Image');
  
    // Create an action that will be triggered when the button is clicked
    var bookingAction = CardService.newAction()
      .setFunctionName('bookRoom')
      .setParameters({'room_id': room, 'last_time': last_time}); // Pass the room ID or any other data as parameters
  
    // Add a button that triggers the booking action
    var bookButton = CardService.newTextButton()
        .setText('Book')
        .setOnClickAction(bookingAction)
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setBackgroundColor('#1a73e8');
  
      // Format the time range string
    var timeRangeText = start_time + ' to ' + last_time;
  
    // Create a text paragraph widget for the time range
    var timeRangeWidget = CardService.newTextParagraph()
        .setText(timeRangeText);
  
    // Add widgets to the section
    var section = CardService.newCardSection()
        .addWidget(imageWidget)
        .addWidget(bookButton)
        .addWidget(timeRangeWidget)
  
    return section
  }
  
  function bookRoom(e) {
    var room = e.commonEventObject.parameters.room_id;
    var last_time = e.commonEventObject.parameters.last_time;
    var scriptProperties = PropertiesService.getScriptProperties();
    var roomBookJson = scriptProperties.getProperty('roomBook');
    var roomBook = JSON.parse(roomBookJson);
  
    var first_name = roomBook.first_name;
    var last_name = roomBook.last_name;
    var email_address = roomBook.email_address;
    var dates = roomBook.dates;
    var times = roomBook.times;
    var event = roomBook.event;
    var calendarId = roomBook.calendarId;
    var eventId = roomBook.eventId;
  
    var newLocation = "Cabot Library Room " + room
    event.location = newLocation;
  
    // Update the event in the calendar
    Calendar.Events.update(event, calendarId, eventId);
  
  
    var payload = {
      'room': room,
      'email_address': email_address,
      'first_name': first_name,
      'last_name': last_name,
      'times': times,
      'date': dates,
      'last_time': last_time
    };
  
    // Prepare the options for the fetch command
    var options = {
      'method': 'post',
      'contentType': 'application/x-www-form-urlencoded',
      'payload': payload
    };
  
    // Get the response from the Heroku server via Flask 
    var response = UrlFetchApp.fetch('https://safe-spire-91577-4a41aef00235.herokuapp.com/book-room', options);
  
    var content = response.getContentText(); // Get the text content from the response
  
    if (content == "True"){
        var card = CardService.newCardBuilder();
  
        // Create a new section
        var section = CardService.newCardSection();
  
        // Create a new text paragraph widget with the desired message
        var textParagraph = CardService.newTextParagraph()
          .setText("Your room was successfully booked for " + dates + " at " + times + " until " + last_time + ". A confirmation email should send to your email address (" + email_address + ") shortly."); // Use the content from the response
  
        // Add the text paragraph to the section
        section.addWidget(textParagraph);
  
        // Add the section to the card
        card.addSection(section);
  
        // Build the card and return it
        return card.build();
    }
  
    if (content == "False"){
        var card = CardService.newCardBuilder();
  
        // Create a new section
        var section = CardService.newCardSection();
  
        // Create a new text paragraph widget with the desired message
        var textParagraph = CardService.newTextParagraph()
          .setText("Your room has failed to book. This may happen because someone booked the room in the time it took you to click the Book option. Please try again."); 
  
        // Add the text paragraph to the section
        section.addWidget(textParagraph);
  
        // Add the section to the card
        card.addSection(section);
  
        // Build the card and return it
        return card.build();
    }
  }
  
  function formatDater(date) {
    // Formats a date to "Month D, YYYY" format
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "MMMM d, yyyy");
  }
  
  function formatTime(startTime) {
    // Formats a time to "H:MM" format
    return Utilities.formatDate(startTime, Session.getScriptTimeZone(), "h:mma").toLowerCase();
  }
  
  function onHomepage(e) {
    // Create a new card builder
    var card = CardService.newCardBuilder();
  
    // Create a new section
    var section = CardService.newCardSection();
  
    // Create a new text paragraph widget with the desired message
    var textParagraph = CardService.newTextParagraph()
      .setText("<b><font size='+3' align='center'>Select an event to see available rooms.</font></b>");
  
    // Add the text paragraph to the section
    section.addWidget(textParagraph);
  
    // Add the section to the card
    card.addSection(section);
  
    // Build the card and return it
    return card.build();
  }
  
  function getCurrentUserName() {
  
    // Use the People API as before to get the user's details
    var userDetails = People.People.get('people/me', {
      personFields: 'names'
    });
  
    var userName = userDetails.names[0].displayName;
    return userName;
  }
  
  
  