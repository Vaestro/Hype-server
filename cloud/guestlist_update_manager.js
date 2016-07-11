var _ = require('underscore');
var moment = require('moment');

module.exports.GuestlistUpdateManager = function GuestlistUpdateManager (eventId, ownerId, eventDate) {


  this.eventId = eventId;

  this.ownerId = ownerId;

  this.eventDate = eventDate;

  this.ownerName = "";


  /*
   * @param: -
   * @description: queries for the owner with the ownerId property
   * @return: if the guests property is empty returns an empty array, else returns a query for the owner
   */
  this.findOwner = function () {

    console.log('-----findOwner-----');

    var queryUser = new Parse.Query(Parse.User)
                             .equalTo("objectId", this.ownerId);

    console.log('query for owner ' + JSON.stringify(queryUser));

    return queryUser.first();
  };


  /*
   * @param: an array with the owner object
   * @description: sends a parse notification to all guests of a guestlist that has been approved or declined
   * @return: if owner arr is empty returns an empty arr, else returns a promise as true, when all the pushes have been sent out
   */
  this.notifyAllGuests = function (owner) {

    console.log(JSON.stringify(this.guests));

    if (_.isEmpty(owner)) {
      return Parse.Promise.as([]);
    }

    this.ownerName = owner[0].get('firstName');
    var queryInstallation = new Parse.Query(Parse.Installation)
                                     .equalTo('deviceType', 'ios');

    var message = "";
    if (this.reviewStatus == 1) {
      message = this.ownerName + "'s guestlist has been approved";
    } else if (this.reviewStatus == 2) {
      message = this.ownerName + "'s guestlist has been declined";
    }

    var installationPromises = _.map(this.guests, function(guest) {

      queryInstallation.equalTo("User", {
        "__type": "Pointer",
        "className": "_User",
        "objectId": guest.mappedGuest.id
      });

      return Parse.Push.send({
        where: queryInstallation,
        data: {
          alert: message,
          badge: "Increment",
          notificationText: message,
          guestlistInviteId: guest.guestlistInviteId
        }
      });
    });

    Parse.Promise.when(installationPromises)
                 .then(function(){
                  return Parse.Promise.as(true);
                 });
  };


  /*
   * @param: -
   * @description: queries for the event with the event id provided
   * @return: returns an empty array if the review status is not 0, else returns event query promise
   */
  this.findEvent = function (ownerQueryResult) {

    console.log('---------findEvent-----------');

    if (_.isEmpty(ownerQueryResult)) {
      console.log('owner query result is empty');
      return Parse.Promise.as([]);
    }

    this.ownerName = ownerQueryResult.get('firstName');

    var queryEvent = new Parse.Query("Event")
                              .equalTo("objectId", this.eventId)
                              .include('location')
                              .include('host');

    console.log('query for event ' + JSON.stringify(queryEvent));
    return queryEvent.first();
  };



  /*
   *
   *
   */
  this.notifyHost = function(eventQueryResult) {
    console.log('------notifyHost--------');
    if (_.isEmpty(eventQueryResult)) {
      console.log('eventQueryResult is empty');
      return Parse.Promise.as([]);
    }

    var locationName = eventQueryResult.get('location').get('name');
    console.log('locationName ' + locationName);

    var host = new Parse.User();
    host.id = eventQueryResult.get('host').id;
    console.log('host ' + JSON.stringify(host));

    var queryInstallation = new Parse.Query(Parse.Installation)
                                     .equalTo('deviceType', 'ios')
                                     .equalTo("User", host);

    formattedDate = moment.utc(this.eventDate).format("MMM Do");
    console.log('formated Date ' + formattedDate);

    return Parse.Push.send({
        where: queryInstallation,
        data: {
          alert: this.ownerName + " has submitted a guestlist for " + locationName + " on " + formattedDate,
          badge: "Increment",
          notificationText: this.ownerName + " has submitted a guestlist for " + locationName + " on " + formattedDate
        }
    });
  };
};
