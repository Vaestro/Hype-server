var _ = require('underscore');
var moment = require('cloud/moment.js');
var GuestlistInvite = Parse.Object.extend("GuestlistInvite");
var Channel = Parse.Object.extend("Channel");
var Guestlist = Parse.Object.extend("Guestlist");
var queryInstallation = new Parse.Query(Parse.Installation);


module.exports.UserOnboardManager = function UserOnboardManager(guestId, guestPhoneNumber) {

  this.guestId = guestId;
  this.guestPhoneNumber = guestPhoneNumber;
  // this.firstName = "";
  // this.eventName = "";

  this.findGuestlistInvitesWithoutGuest = function() {
    var queryGuestlistInvite = new Parse.Query("GuestlistInvite")
      .equalTo('phoneNumber', this.guestPhoneNumber)
      .doesNotExist('Guest')
      .include('sender')
      .include('event')
      .include('event.location')
      .descending('createdAt');
    return queryGuestlistInvite.find();
  };

  this.assignGuestToGuestlistInvite = function(guestlistInviteQuery) {
    if (_.isEmpty(guestlistInviteQuery)) {
      console.log('didnt find a guestlistInvite');
      return Parse.Promise.as([]);
    }

    guest = new Parse.User();
    guest.id = this.guestId

    console.log('guestlistInvite ' + JSON.stringify(guestlistInviteQuery[0]));

    var assignedGuestlistInvites = _.map(guestlistInviteQuery, function(guestlistInvite) {
      guestlistInvite.set("Guest", guest);
      guestlistInvite.set("response", 2);
      return guestlistInvite;
    });

    return Parse.Object.saveAll(assignedGuestlistInvites);
  };


  this.notifyUserOfGuestlistInvite = function (assignedGuestlistInvites) {

    if (_.isEmpty(assignedGuestlistInvites)) {
      return Parse.Promise.as([]);
    }

    console.log('assignGuestToGuestlistInvites ' + JSON.stringify(assignedGuestlistInvites));

    user = new Parse.User();
    user.id = this.guestId

    queryInstallation.equalTo('deviceType', 'ios');
    queryInstallation.equalTo("User", user);

    var guestlistInvite = assignedGuestlistInvites[0];
    console.log('guestlistInviteID is ' + guestlistInvite.id);

    return Parse.Push.send({
        where: queryInstallation,
        data: {
          "alert": "One of your friends has invited you to a party",
          "badge": "Increment",
          "guestlistInviteId": guestlistInvite.id
        }
    });
  };

};

