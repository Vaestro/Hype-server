var _ = require('underscore');
var moment = require('moment');
var queryInstallation = new Parse.Query(Parse.Installation);
var GuestlistTicket = Parse.Object.extend("GuestlistTicket");
var Event = Parse.Object.extend("Event");
var Guestlist = Parse.Object.extend("Guestlist");
var GuestlistInvite = Parse.Object.extend("GuestlistInvite");


module.exports.TicketScannerManager = function TicketScannerManager(guestlistTicketId) {

  this.guestlistTicketId = guestlistTicketId;

  /**
   * @params: guestlistTicketQuery
   * @description: queries for a
   * @return: returns a query for a guestlist as a promise
   */
  this.findGuestlistInviteById = function() {


    console.log('guestlistTicketId is ' + this.guestlistTicketId);

    var guestlistTicket = new GuestlistTicket();
    guestlistTicket.id = this.guestlistTicketId;

    var queryGueslistInvites = new Parse.Query("GuestlistInvite")
      .equalTo('guestlistTicket', guestlistTicket);

    return queryGuestlistInvites.find();
  }





  // this.generateGuestlistTicketForSender = function(gues) {

  //   var guestlistTicket = new GuestlistTicket();

  //   if (_.isEmpty(guestlistTicketQuery)) {
  //     sender = new Parse.User();
  //     sender.id = this.senderId;

  //     guestlist = new Guestlist();
  //     guestlist.id = this.guestlistId;

  //     guestlistTicket.set("sender", sender);
  //     guestlistTicket.set("guestlist", guestlist);
  //     guestlistTicket.set("scanned", false);

  //   } else {

  //     return Parse.Promise.as([]);
  //   }

  //   return guestlistTicket.save();
  // };
};
