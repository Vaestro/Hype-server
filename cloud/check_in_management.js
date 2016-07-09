var _ = require('underscore');
var moment = require('cloud/moment.js');
var queryInstallation = new Parse.Query(Parse.Installation);


module.exports.CheckInManager = function CheckInManager(guestId, senderId, guestlistId) {

  this.guestId = guestId;
  this.senderId = senderId;
  this.guestlistId = guestlistId;
  this.guestName = "";

  /* 
   * @param: -
   * @description: queries for the sender with the senderId property
   * @return: if the guests property is empty returns an empty array, else returns a query for the sender
   */
  this.findSender = function() {
    var queryUser = new Parse.Query(Parse.User)
      .equalTo("objectId", this.senderId);
    return queryUser.first();
  };


  /**
   * @param: _User object 
   * @description: this function gifts the Sender credits
   * @return: a Parse Promise in the form of a Parse Object Save
   */
  this.creditSender = function(sender) {

    if (_.isEmpty(sender)) {
      console.log('empty');
      return Parse.Promise.as([]);
    }

    var credits = sender.get("credits");
    console.log('credits ' + credits);
    credits += 5;
    Parse.Cloud.useMasterKey();
    sender.set("credits", credits);
    return sender.save();
  };


  this.findGuest = function() {

    var queryUser = new Parse.Query(Parse.User)
      .equalTo("objectId", this.guestId);
    return queryUser.first();

  }

  this.notifySender = function(guest) {

    if (_.isEmpty(guest)) {
      return Parse.Promise.as([]);
    }

    var guestName = guest.get("firstName");

    this.guestName = guestName;

    queryInstallation.equalTo('deviceType', 'ios');
    queryInstallation.equalTo("User", {
      "__type": "Pointer",
      "className": "_User",
      "objectId": this.senderId
    });

    return Parse.Push.send({
      where: queryInstallation,
      data: {
        alert: "One of your guests has checked in",
        badge: "Increment",
        notificationText: guestName + " has checked in!"
      }
    });
  };

  this.findGuestlist = function (response) {

    if (_.isEmpty(response)) {
      return Parse.Promise.as([]);
    }

    var queryGuestlist = new Parse.Query("Guestlist")
                                        .equalTo('objectId', this.guestlistId);

    return queryGuestlist.first();
  };


  this.findEvent = function(guestlistQuery) {

    if (_.isEmpty(guestlistQuery)) {
      return Parse.Promise.as([]);
    }

    var eventId = guestlistQuery.get('event').id;


    var queryEvent = new Parse.Query("Event")
                              .equalTo('objectId', eventId);

    return queryEvent.first();
  };


  this.notifyHost = function(eventQuery) {

    if (_.isEmpty(eventQuery)) {
      return Parse.Promise.as([]);
    }

    var hostId = eventQuery.get('host').id;


    queryInstallation.equalTo('deviceType', 'ios');
    queryInstallation.equalTo("User", {
      "__type": "Pointer",
      "className": "_User",
      "objectId": hostId
    });

    return Parse.Push.send({
      where: queryInstallation,
      data: {
        alert: "One of your guests has checked in",
        badge: "Increment",
        notificationText: this.guestName + " has checked in!"
      }
    });
  };
};