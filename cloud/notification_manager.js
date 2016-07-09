var _ = require('underscore');
var twilioSID = 'AC5769b578ec09cd8522d36f3b12ac07c7';
var twilioAuthToken = 'b6991654dae45aa26f4219335cd63418';
var twilioPhoneNumber = '+18443111724';
var queryInstallation = new Parse.Query(Parse.Installation);
var twilio = require('twilio')(twilioSID, twilioAuthToken);

/**
 * This object handles the creation and management of guest notifications for
 * for both known and unknown users.
 */
 module.exports.NotificationManager = function NotificationManager (guestPhoneNumbers, eventName, eventTime, firstName) {

  this.guestPhoneNumbers = guestPhoneNumbers;
  this.knownGuests = [];
  this.unknownGuestPhoneNumbers = [];
  this.eventName = eventName;
  this.eventTime = eventTime;
  this.firstName = firstName;

  /**
   * @params: an array of guestlist invites with registered users
   * @description: iterates through the users and sends out a push notification to each user
   * @return: returns a promise as truthy, unless the array is of guestlist invites is empty
   */
  this.notifyKnownGuests = function (arrayOfGuestlistInvites) {

    console.log('------------notifyKnownGuests----------');

    console.log('array of known Guestlist Invites ' + JSON.stringify(arrayOfGuestlistInvites));

    if (_.isEmpty(arrayOfGuestlistInvites)) {
      console.log('[] guestlistinvites is empty');
      return Parse.Promise.as([]);
    }

    var eventName = this.eventName;
    console.log('eventName ' + JSON.stringify(eventName));

    var firstName = this.firstName;
    console.log('firstName ' + firstName);

    console.log('mapping [] of guestlistInvites');
    var installationPromises = _.map(arrayOfGuestlistInvites, function(guestlistInvite){

      
      console.log('guestlistInvite ' + JSON.stringify(guestlistInvite));

      guest = new Parse.User();
      guest.id = guestlistInvite.get("Guest").id;
      console.log('guest ' + JSON.stringify(guest));

      queryInstallation.equalTo('deviceType', 'ios');
      queryInstallation.equalTo("User", guest);
      console.log('queryInstallation ' + JSON.stringify(queryInstallation));

      return Parse.Push.send({
        where: queryInstallation,
        data: {
          "alert": firstName + ' has invited you to party at ' + eventName,
          "badge": "Increment",
          "notificationText": firstName + " has invited you to party at " + eventName 
        }
      });
    });

    Parse.Promise.when(installationPromises)
                 .then(function(sentInstallationPromises){
                  console.log('installation Promises resolved ' + sentInstallationPromises);
                  return Parse.Promise.as(true);
                 });
  };


  /**
   * @params: an array of guestlist invites with unregistered users
   * @description: iterates through the users and sends out a text message to each user
   * @return: returns a promise as truthy, unless the array is of guestlist invites is empty
   */
  this.notifyUnknownGuests = function (arrayOfUnknownGuestlistInvites) {

    if (_.isEmpty(arrayOfUnknownGuestlistInvites)) {
      return Parse.Promise.as([]);
    }

    var firstName = this.firstName;
    var eventName = this.eventName;

    var textPromises = _.map(arrayOfUnknownGuestlistInvites, function(guestlistInvite){
      var phoneNumber = guestlistInvite.get('phoneNumber');
      var randomCode = guestlistInvite.get('invitationCode');
      return twilio.sendSms({
        to: phoneNumber,
        from: twilioPhoneNumber,
        body: "Hey " + firstName + " has invited you to " + eventName + "! " + "Download Hype @ https://bnc.lt/m/aTR7pkSq0q" + " Your invitation code is " + randomCode
      });
    });

    Parse.Promise.when(textPromises)
                 .then(function() {
                  return Parse.Promise.as(true);
                 });
  };

};









