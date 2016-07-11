var _ = require('underscore');
var moment = require('moment');
var queryInstallation = new Parse.Query(Parse.Installation);
var GuestlistTicket = Parse.Object.extend("GuestlistTicket");
var Event = Parse.Object.extend("Event");
var Guestlist = Parse.Object.extend("Guestlist");

/* @GuestlistTicket {
    sender: User pointer
    guestlist: Guestlist Pointer
    qrCode: PFFile
    scanned: bool
  }
 **/

module.exports.GuestlistTicketManager = function GuestlistTicketManager(guestlistId, senderId) {

  this.guestlistId = guestlistId;
  this.senderId = senderId;

  /**
   * @params: guestlistQuery
   * @description: queries for a
   * @return: returns a query for a guestlist as a promise
   */
  this.findGuestlistTicketsForGuestlist = function() {

    guestlist = new Guestlist();
    guestlist.id = this.guestlistId;
    console.log('guestlistId ' + guestlist.id);

    var queryGuestlistTickets = new Parse.Query("GuestlistTicket")
      .equalTo('guestlist', guestlist);

    return queryGuestlistTickets.find();
  }

  this.generateGuestlistTicketForSender = function(guestlistOwnerInvite) {

    var guestlistTicket = new GuestlistTicket();

    if (_.isEmpty(guestlistTicketQuery)) {
      sender = new Parse.User();
      sender.id = this.senderId;

      guestlist = new Guestlist();
      guestlist.id = this.guestlistId;

      guestlistTicket.set("sender", sender);
      guestlistTicket.set("guestlist", guestlist);
      guestlistTicket.set("scanned", false);

    } else {

      return Parse.Promise.as([]);
    }

    return guestlistTicket.save();
  };
};
