var _ = require('underscore');
var moment = require('cloud/moment.js');
var Guestlist = Parse.Object.extend("Guestlist");
var GuestlistInvite = Parse.Object.extend("GuestlistInvite");
/**
 * This object handles the creation and management of guest invites for
 * for both known and unknown users.
 */
module.exports.GuestlistManager = function GuestlistManager(guestPhoneNumbers, guestlistId, eventTime, ownerId) {

  /** This holds reference to all of the provided phone numbers that will be processed. */
  this.guestPhoneNumbers = guestPhoneNumbers;
  /** .. */
  this.knownGuests = [];
  /** .. */
  this.unknownGuestPhoneNumbers = [];
  /** .. */
  this.guestlistId = guestlistId;
  /** .. */
  this.eventTime = eventTime;
  /** .. */
  this.ownerId = ownerId;

  this.knownGuestIds = [];

  this.knownOwnerId = [];


  /** 
   * This queries the system to locate known users by their provided phone numbers.
   * @return A promise that will return the known results of the query.
   */
  this.findGuestsByPhoneNumber = function() {
    console.log('--------findGuestsByPhoneNumber--------');
    console.log('guest phone numbers ' + this.guestPhoneNumbers);
    var queryUser = new Parse.Query(Parse.User)
      .containedIn("phoneNumber", this.guestPhoneNumbers);
    console.log('queryUser ' + JSON.stringify(queryUser));
    return queryUser.find();
  };

  /**
   * Filter out the known users from the unknown users within the system.
   * @param users - An array of known users within the system.
   */
  this.filter = function(users) {
    console.log('------------------filter--------------------');
    console.log('user query results ' + JSON.stringify(users));

    this.knownGuests = users;
    console.log('known guests ' + JSON.stringify(this.knownGuests));


    var knownGuestsPhoneNumbers = _.map(users, function(user) {
      return user.get('phoneNumber')
    });
    console.log('knownGuestsPhoneNumbers ' + knownGuestsPhoneNumbers);

    this.unknownGuestPhoneNumbers = _.filter(this.guestPhoneNumbers, function(phoneNumber) {
      return !_.contains(knownGuestsPhoneNumbers, phoneNumber);
    });

    console.log('unknownGuestPhoneNumbers ' + this.unknownGuestPhoneNumbers);
    return Parse.Promise.as(true);
  };

  /**
   * This function will create an invite for all of the known users within the system.
   */
  this.createKnownGuestInvites = function() {

    if (_.isEmpty(this.knownGuests)) {
      return Parse.Promise.as([]);
    }

    this.knownGuestIds = _.map(this.knownGuests, function(user) {
      return user.id;
    });

    console.log('createKnownGuestInvites for guestId(s): ' + this.knownGuestIds);

    var eventTime = new Date(Date.parse(this.eventTime));
    var guestlistId = this.guestlistId;
    var ownerId = this.ownerId;

    var guestlistTicket = new GuestlistTicket();
    guestlistTicket.id = this.guestlistTicketId;


    var inviteList = _.map(this.knownGuests, function(user) {

      var guestlist = new Guestlist();
      guestlist.id = guestlistId;

      var guest = new Parse.User();
      guest.id = user.id

      var sender = new Parse.User();
      sender.id = ownerId;

      var guestlistInvite = new GuestlistInvite(); 
      guestlistInvite.set("phoneNumber", user.get('phoneNumber'));
      guestlistInvite.set("Guestlist", guestlist);
      guestlistInvite.set("Guest", guest);
      guestlistInvite.set("sender", sender);
      guestlistInvite.set("checkInStatus", false);
      guestlistInvite.set("response", 2);
      guestlistInvite.set("date", eventTime);

      return guestlistInvite;

    });

    return Parse.Object.saveAll(inviteList);
  };


  /**
   * This function will create an invite for all of the unknown users within the system.
   */
  this.createUnKnownGuestInvites = function() {

    if (_.isEmpty(this.unknownGuestPhoneNumbers)) {
      console.log('logging out early');
      return Parse.Promise.as([]);
    }

    console.log("promotion time: " + this.eventTime)
    console.log("ownerId: " + this.ownerId);

    var eventTime = new Date(Date.parse(this.eventTime));

    var guestlistId = this.guestlistId;
    var ownerId = this.ownerId;

    var guestlistTicket = new GuestlistTicket();
    guestlistTicket.id = this.guestlistTicketId;

    var inviteList = _.map(this.unknownGuestPhoneNumbers, function(phoneNumber) {

      return new Parse.Object("GuestlistInvite", {
        phoneNumber: phoneNumber,
        Guestlist: {
          "__type": "Pointer",
          "className": "Guestlist",
          "objectId": guestlistId
        },
        sender: {
          "__type": "Pointer",
          "className": "_User",
          "objectId": ownerId
        },
        checkInStatus: false,
        response: 0,
        date: eventTime
      });

    });

    return Parse.Object.saveAll(inviteList);
  };

  this.returnKnownGuestIds = function(array) {

    if (_.isEmpty(this.knownOwnerId)) {
      return Parse.Promise.as(this.knownGuestIds);
    } else {
      return Parse.Promise.as(this.knownGuestIds.concat(this.knownOwnerId));
    }
  };

};