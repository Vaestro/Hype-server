/* *
 * The HypeList Cloud Code
 * Author: Daniel Aksenov
 */
var moment = require('moment');

var twilioSID = 'AC5769b578ec09cd8522d36f3b12ac07c7';
var twilioAuthToken = 'b6991654dae45aa26f4219335cd63418';
var twilioPhoneNumber = '+18443114973';
var queryInstallation = new Parse.Query(Parse.Installation);
var twilio = require('twilio')(twilioSID, twilioAuthToken);
var Mixpanel = require('mixpanel');
var mixpanelToken = "2946053341530a84c490a107bd3e5fff";
var Mailgun = require('mailgun-js')({
    apiKey: 'gethype.co',
    domain: 'key-2beb52eae9bf4631d909ebaadaec1264'
});
// var mandrill = require('mandrill-api/mandrill');
// var mandrill_client = new mandrill.Mandrill('4Rd4imd3JMZZrIqktdPqEA');
var mandrill_function = require("./mandrill_email.js");

var Stripe = require('stripe')('sk_test_OKwk3On1VYINpv2wJX2PMnCn');

var STRIPE_SECRET_KEY = 'sk_test_OKwk3On1VYINpv2wJX2PMnCn';
var STRIPE_API_BASE_URL = 'api.stripe.com/v1';

var INTERCOM_BASE_URL = 'eixn8wsn:5c0f7a0f42d3705369ed53d5d0c6695039a3ab58@api.intercom.io';

/* Use: helpers */
var _ = require('underscore');
var hypelist = require('./guestlistmanager.js');
var notify = require('./notification_manager.js');
var update = require('./guestlist_update_manager.js');
var perkStore = require('./perk_store_item_manager.js');
var checkInManagement = require('./check_in_management.js');
var guestlistTicketManagement = require('./guestlist_ticket_manager.js');
var userOnboard = require('./user_onboard_manager.js');
var entryCode = require('./code_redemption_manager.js');
var GuestlistInvite = Parse.Object.extend("GuestlistInvite");
var Guestlist = Parse.Object.extend("Guestlist");
var Event = Parse.Object.extend("Event");
var AdmissionOption = Parse.Object.extend("AdmissionOption");
var Inquiry = Parse.Object.extend("Inquiry");

var User = Parse.User;



Parse.Cloud.define('sendOutInvitations', function(request, response) {

    var knownGuests = [];
    var unknownGuestPhoneNumbers = [];
    var event;

    Parse.Promise.as().then(function() {

        event = new Event();
        event.id = request.params.eventId;

        //find guests by phone number
        var queryUser = new Parse.Query(Parse.User).containedIn("phoneNumber", request.params.guestPhoneNumbers);
        return queryUser.find().then(null, function(error) {
            console.log("There was an error searching for guests");
            return Parse.Promise.error("There was an error in sending out the invites. Please Try again")
        });
    }).then(function(result) {
        //filter out known and unknown guests
        knownGuests = result;
        var knownGuestPhoneNumbers = _.map(result, function(user) {
            return user.get('phoneNumber');
        });

        unknownGuestPhoneNumbers = _.filter(request.params.guestPhoneNumbers, function(phoneNumber) {
            return !_.contains(knownGuestPhoneNumbers, phoneNumber);
        });

        return Parse.Promise.as([]);
    }).then(function() {
        //create known guest invites

        if (_.isEmpty(knownGuests)) {
            return Parse.Promise.as([]);
        }

        var inviteList = _.map(knownGuests, function(user) {

            var guestlist = new Guestlist();
            guestlist.id = request.params.guestlistId;

            var guest = new Parse.User();
            guest.id = user.id;

            var sender = new Parse.User();
            sender.id = request.user.id;

            var guestlistInvite = new GuestlistInvite();
            guestlistInvite.set("phoneNumber", user.get('phoneNumber'));
            guestlistInvite.set("Guestlist", guestlist);
            guestlistInvite.set("Guest", guest);
            guestlistInvite.set("sender", sender);
            guestlistInvite.set("checkInStatus", false);
            guestlistInvite.set("response", 2);
            guestlistInvite.set("event", event);
            guestlistInvite.set("didOpen", false);
            guestlistInvite.set("date", new Date(Date.parse(request.params.eventTime)));

            return guestlistInvite;
        });

        return Parse.Object.saveAll(inviteList).then(null, function(error) {
            console.log("There was an error generating guestlist invites. Error " + error);
            return Parse.Promise.error("There was an error in sending out the invites. Please Try again")
        });
    }).then(function(guestlistInvites) {

        if (_.isEmpty(guestlistInvites)) {
            return Parse.Promise.as([]);
        }

        var installationPromises = _.map(guestlistInvites, function(guestlistInvite) {

            guest = new Parse.User();
            guest.id = guestlistInvite.get("Guest").id;

            queryInstallation.equalTo('deviceType', 'ios');
            queryInstallation.equalTo("User", guest);

            return Parse.Push.send({
                where: queryInstallation,
                data: {
                    "alert": request.user.get("firstName") + ' has invited you to party at ' + request.params.eventName,
                    "badge": "Increment",
                    "guestlistInviteId": guestlistInvite.id
                }
            }, {
                useMasterKey: true
            });
        });

        Parse.Promise.when(installationPromises)
            .then(function(sentInstallationPromises) {
                console.log('installation Promises resolved ' + sentInstallationPromises);
                return Parse.Promise.as(true);
            });
    }).then(function() {

        //create unknown guest list invites
        if (_.isEmpty(unknownGuestPhoneNumbers)) {
            return Parse.Promise.as([]);
        }

        var inviteList = _.map(unknownGuestPhoneNumbers, function(phoneNumber) {

            var guestlist = new Guestlist();
            guestlist.id = request.params.guestlistId;

            var sender = new Parse.User();
            sender.id = request.user.id;

            var guestlistInvite = new GuestlistInvite();
            guestlistInvite.set("phoneNumber", phoneNumber);
            guestlistInvite.set("Guestlist", guestlist);
            guestlistInvite.set("sender", sender);
            guestlistInvite.set("checkInStatus", false);
            guestlistInvite.set("response", 0);
            guestlistInvite.set("event", event);
            guestlistInvite.set("didOpen", false);
            guestlistInvite.set("date", new Date(Date.parse(request.params.eventTime)));

            return guestlistInvite;
        });

        return Parse.Object.saveAll(inviteList).then(null, function(error) {
            console.log("There was an error generating guestlist invites. Error " + error);
            return Parse.Promise.error("There was an error in sending out the invites. Please Try again");
        });
    }).then(function(arrayOfUnknownGuestlistInvites) {

        if (_.isEmpty(arrayOfUnknownGuestlistInvites)) {
            return Parse.Promise.as([]);
        }

        var firstName = this.firstName;
        var eventName = this.eventName;

        var textPromises = _.map(arrayOfUnknownGuestlistInvites, function(guestlistInvite) {
            var phoneNumber = guestlistInvite.get('phoneNumber');
            var randomCode = guestlistInvite.get('invitationCode');
            return twilio.sendSms({
                to: phoneNumber,
                from: twilioPhoneNumber,
                body: "Hey " + request.user.get("firstName") + " has invited you to " + request.params.eventName + "! " + "Download Hype @ " + request.params.branchUrl
            });
        });

        Parse.Promise.when(textPromises).then(function() {
            return Parse.Promise.as(true);
        });
    }).then(function() {
        response.success();
    }, function(error) {
        response.error(error);
    })
});


/**
 * a purchase is verified and then the credits are updated, followed by the creation of a purchased perk store item, and followed up
 * by an email
 */
Parse.Cloud.define('purchasePerkStoreItem', function(request, response) {
    var perkStoreItemCost = request.params.perkStoreItemCost;
    var perkStoreItemId = request.params.perkStoreItemId;
    var perkStoreItemName = request.params.perkStoreItemName;
    var userEmail = request.params.userEmail;
    var userName = request.user.get("firstName");
    var ownerId = request.user.id;
    var ownerCredits = request.user.get("credits");

    var perkStoreItemManager = new perkStore.PerkStoreItemManager(ownerId, perkStoreItemId, perkStoreItemCost, ownerCredits, perkStoreItemName, userEmail, userName);

    _.bindAll(perkStoreItemManager, 'findOwnerById', 'updateOwnerCredits', 'createPurchasedPerkStoreItem', 'sendIntercomMessage', 'findIntercomId');

    perkStoreItemManager.findOwnerById()
        .then(perkStoreItemManager.updateOwnerCredits)
        .then(perkStoreItemManager.createPurchasedPerkStoreItem)
        .then(perkStoreItemManager.findIntercomId)
        .then(perkStoreItemManager.sendIntercomMessage)
        .then(function(poop) {
            response.success('success');
        }, function(error) {
            response.error('Error: ' + error.message);
        });
});

/**
 *assigns user to guestlist invites on onboarding
 */
Parse.Cloud.define("assignGuestToGuestlistInvite", function(request, response) {

    var guestId = request.user.id;
    var guestPhoneNumber = request.user.get('phoneNumber');

    var userOnboardManager = new userOnboard.UserOnboardManager(guestId, guestPhoneNumber);

    _.bindAll(userOnboardManager, 'findGuestlistInvitesWithoutGuest', 'assignGuestToGuestlistInvite', 'notifyUserOfGuestlistInvite');

    userOnboardManager.findGuestlistInvitesWithoutGuest()
        .then(userOnboardManager.assignGuestToGuestlistInvite)
        .then(userOnboardManager.notifyUserOfGuestlistInvite)
        .then(function(result) {
            response.success();
        }, function(error) {
            response.error();
        });

});


Parse.Cloud.define("redeemReferralCode", function(request, response) {

    // Parse.Cloud.useMasterKey();

    var guestId = request.user.id;
    var promotionCode = request.params.referralCode.toUpperCase();

    console.log('promocode ' + promotionCode);

    var codeRedemptionManager = new entryCode.CodeRedemptionManager(guestId, promotionCode);

    _.bindAll(codeRedemptionManager, 'queryActivePromotionCode', 'queryPromoCodeEntry', 'generatePromoCodeEntry', 'creditUser');

    codeRedemptionManager.queryActivePromotionCode()
        .then(codeRedemptionManager.queryPromoCodeEntry)
        .then(codeRedemptionManager.generatePromoCodeEntry)
        .then(codeRedemptionManager.creditUser)
        .then(function(result) {
            var bool = true;
            if (_.isEmpty(result)) {
                bool = false;
            }
            response.success(bool);
        }, function(error) {
            response.error(error);
        });
});

Parse.Cloud.define('validateTicket', function(request, response) {

    // Parse.Cloud.useMasterKey();

    var guestlistInvite, event;

    Parse.Promise.as().then(function() {

        var user = new Parse.User();
        user.id = request.params.guestId;

        var guestlist = new Guestlist();
        guestlist.id = request.params.guestlistId;

        var guestlistInviteQuery = new Parse.Query('GuestlistInvite');
        guestlistInviteQuery.equalTo('Guestlist', guestlist)
            .equalTo('Guest', user)
            .equalTo('checkInStatus', false)
            .include('event')
            .include('event.location');

        return guestlistInviteQuery.first({
            useMasterKey: true
        }).then(null, function(error) {
            console.log('There was an error querying ' + JSON.stringify(error));
            return Parse.Promise.error('This ticket has already been scanned.');
        });
    }).then(function(guestlistInviteResult) {

        if (!guestlistInviteResult) {
            console.log('there was an error querying for glinvite ' + JSON.stringify(guestlistInviteResult));
            return Parse.Promise.error('This ticket has already been scanned.');
        }

        event = guestlistInviteResult.get('event');
        guestlistInvite = guestlistInviteResult;

        var userQuery = new Parse.Query(Parse.User);
        userQuery.equalTo("objectId", request.params.guestId);

        return userQuery.first({
            useMasterKey: true
        }).then(null, function(error) {
            return Parse.Promise.error('There was an issue retrieving user data.Please try scanning again');
        });
    }).then(function(guest) {

        if (!guest) {
            return Parse.Promise.error('This user does not exist');
        }

        var mixpanel = Mixpanel.init(mixpanelToken);
        var distinctId = guest.id;
        var properties = {
            'distinct_id': distinctId,
            'ticket_scanned': true
        };

        mixpanel.track('scannedTicket', properties);

        var ticketInfo = {
            "name": guest.get("firstName") + " " + guest.get("lastName"),
            "sex": guest.get("sex") == 1 ? "Male" : "Female",
            "venue": event.get("location").get("name"),
            "date": moment.utc(event.get("date")).format("MMM Do"),
            "guestlistInviteId": guestlistInvite.id
        };

        return ticketInfo;
    }).then(function(ticketInfo) {
        response.success(ticketInfo);
    }, function(error) {
        response.error(error);
    });
});


Parse.Cloud.define('createStripeCustomer', function(request, response) {

    //Parse.Cloud.useMasterKey();

    var customer;

    Parse.Promise.as().then(function() {
         console.log("createStripeCustomer:",request.params.stripeToken)
           console.log(request.user.get("username") + " " + request.user.get("lastName"))

        return Stripe.customers.create({
            source: request.params.stripeToken,
            description: request.user.get("firstName") + " " + request.user.get("lastName")
        }).then(null, function(error) {

            console.log('Storing card information with stripe failed. Error: ' + error);
            return Parse.Promise.error('An error has occurred. Your credit card was not added. Try again');

        });
    }).then(function(stripeCustomer) {

        customer = stripeCustomer;

        // user = new User();
        // user.id = request.user.id;
        var user = request.user;

        var token = user.getSessionToken();
        user.set("stripeCustomerId", customer.id);

        return user.save(null, {
            sessionToken: token
        }).then(null, function(error) {
            console.log("Update User with stripe customer id failed.Error: " + error);
            return Parse.Promise.error('An error has occurred updating your user information. Please try again');
        });

    }).then(function() {

        response.success(customer.sources.data);

    }, function(error) {

        response.error(error);

    });
});

/**
 * submit Hype Connect inquiry function
 *
 */
Parse.Cloud.define('submitConnectInquiry', function(request, response) {

    var inquiry, event, guestlist, guestlistInvite, admissionOption, owner;

    Parse.Promise.as().then(function(completedTransaction) {
        owner = request.user;
        var token = owner.getSessionToken();

        event = new Event();
        event.id = request.params.eventId;

        inquiry = new Inquiry();
        if (event.get("venueName")) inquiry.set("venueName", event.get("venueName"));
        inquiry.set("Sender", owner);
        inquiry.set("date", new Date(Date.parse(request.params.eventTime)));
        inquiry.set("connected", false);
        inquiry.set("Event", event);

        return inquiry.save().then(null, function(error) {
            console.log("Saving inquiry failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(inquiry) {
        admissionOption = new AdmissionOption();
        admissionOption.id = request.params.admissionOptionId;

        guestlist = new Guestlist();
        guestlist.set("Owner", owner);
        guestlist.set("event", event);
        guestlist.set("Inquiry", inquiry);
        guestlist.set("date", new Date());
        guestlist.set("admissionOption", admissionOption);

        return guestlist.save().then(null, function(error) {
            console.log("Saving guestlist failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(guestlist) {
        guestlistInvite = new GuestlistInvite();
        guestlistInvite.set("Guestlist", guestlist);
        guestlistInvite.set("event", event);
        guestlistInvite.set("Guest", owner);
        guestlistInvite.set("sender", owner);
        guestlistInvite.set("checkInStatus", false);
        guestlistInvite.set("response", 1);
        guestlistInvite.set("phoneNumber", owner.get('phoneNumber'));
        guestlistInvite.set("date", new Date(Date.parse(request.params.eventTime)));
        guestlistInvite.set("didOpen", false);
        guestlistInvite.set("admissionDescription", request.params.description);

        return guestlistInvite.save().then(null, function(error) {
            console.log("Saving guestlist invite failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist invite. Please contact us through chat to resolive this issue as quickly as possible.");
        });

    }).then(function(guestlistInvite) {
        response.success(guestlistInvite);
    }, function(error) {
        response.error(error);
    });
});

/**
 * complete order function
 *
 */
Parse.Cloud.define('completeOrder', function(request, response) {



    var completedTransaction, event, guestlist, customer, guestlistInvite, admissionOption;

    Parse.Promise.as().then(function() {

        if (request.params.amount >= 0.5) {
            return Stripe.charges.create({
                customer: request.user.get("stripeCustomerId"),
                amount: (Math.round(request.params.amount * 100)),
                currency: "usd",
                description: request.params.description + " for  " + request.params.venue
            }).then(null, function(error) {
                console.log("Charing customer failed. Error: " + error);
                return Parse.Promise.error("There was an error processing the card. Please try again");
            });
        }
    }).then(function(purchase) {

        // customer = new Parse.User();
        // customer.id = request.user.id;
        customer = request.user;
        var token = customer.getSessionToken();

        event = new Event();
        event.id = request.params.eventId;

        admissionOption = new AdmissionOption();
        admissionOption.id = request.params.admissionOptionId;

        completedTransaction = new Parse.Object('CompletedTransaction');
        completedTransaction.set("description", request.params.description);
        completedTransaction.set("date", new Date());
        completedTransaction.set("customerName", request.params.customerName);
        completedTransaction.set("venue", request.params.venue);
        completedTransaction.set("amountPaid", request.params.amount.toFixed(2));
        completedTransaction.set("customer", customer);
        completedTransaction.set("event", event);
        completedTransaction.set("admissionOption", admissionOption);
        // completedTransaction.set("stripePurchaseId", purchase.id);

        return completedTransaction.save(null, {
            sessionToken: token
        }).then(null, function(error) {
            console.log('There was an error saving the completed transaction. Error: ' + JSON.stringify(error));
            return Parse.Promise.error("There was an error storing your transaction. Please contact us through chat to resolve this issue as quick as possible.");
        });
    }).then(function(completedTransaction) {

        guestlist = new Guestlist();
        guestlist.set("Owner", customer);
        guestlist.set("event", event);
        guestlist.set("date", new Date());
        guestlist.set("admissionOption", admissionOption);

        return guestlist.save().then(null, function(error) {
            console.log("Saving guestlist failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(savedGuestlist) {

        guestlist = savedGuestlist;

        guestlistInvite = new GuestlistInvite();
        guestlistInvite.set("Guestlist", guestlist);
        guestlistInvite.set("event", event);
        guestlistInvite.set("Guest", customer);
        guestlistInvite.set("sender", customer);
        guestlistInvite.set("checkInStatus", false);
        guestlistInvite.set("response", 1);
        guestlistInvite.set("phoneNumber", request.user.get('phoneNumber'));
        guestlistInvite.set("date", new Date(Date.parse(request.params.eventTime)));
        guestlistInvite.set("didOpen", false);
        guestlistInvite.set("admissionDescription", request.params.description);

        return Parse.Cloud.httpRequest({
            url: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + customer.id + "_" + guestlist.id
        }).then(null, function(httpResponse) {
            console.error("Error generating qr code. HttpResponse: " + httpResponse.status);
            return Parse.Promise.error("There was an error generating your ticket. Please contact us through chat to resolve this issue as quickly as possible.");
        });



    }).then(function(httpresponse) {

        var imageBuffer = httpresponse.buffer;
        var parseFile = new Parse.File('ticket.png', {
            base64: imageBuffer.toString('base64')
        });

        guestlistInvite.set("qrCode", parseFile);
        guestlistInvite.set("qrbase64", imageBuffer.toString('base64'));
        return guestlistInvite.save().then(null, function(error) {
            console.log("Saving guestlist invite failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist invite. Please contact us through chat to resolive this issue as quickly as possible.");
        });

    }).then(function(guestlistInvite) {
        response.success(guestlist);
        return guestlistInvite;
    }, function(error) {
        response.error(error);
    }).then(function(guestlistInvite) {
        // send email using mandrill
        console.log("request.params.description", request.params.description);
        // console.log("event.location:",event.location.get('name') );
        console.log("request.params.eventTime:", request.params.eventTime);
        var message = {

            "html": "<p><b>" + request.params.description + "</b></p></br><p>PLEASE PRESENT TICKET TO DOORMAN</p>",
            "text": "Example text content, Hello World",
            "subject": "Your ticket confirmation for" + " " + " on " + request.params.eventTime + " ",
            "from_email": "contact@gethype.co",
            "from_name": "Hype",
            "to": [{
                "email": customer.get("email"),
                "name": customer.get("firstName") + " " + customer.get("lastName"),
                "type": "to"
            }],
            "headers": {
                "Reply-To": "contact@gethype.co"
            },
            "important": true,

            "bcc_address": "contact@gethype.co",

            "recipient_metadata": [{
                "rcpt": customer.get("email"),
                "values": {
                    "user_id": customer.id
                }
            }],
            "images": [{
                "type": "image/png",
                "name": "IMAGECID",
                "content": guestlistInvite.get("qrbase64")
            }]
        };

        mandrill_function.mandrill_email(message);


    });
});


/****** completing order for guestlist invite *****/

Parse.Cloud.define('completeOrderForInvite', function(request, response) {


    // Parse.Cloud.useMasterKey();

    var guestlistInvite;
    Parse.Promise.as().then(function() {

        if (request.params.amount >= 0.5) {
            return Stripe.charges.create({
                customer: request.user.get("stripeCustomerId"),
                amount: (Math.round(request.params.amount * 100)),
                currency: "usd",
                description: request.params.description + " for  " + request.params.venue
            }).then(null, function(error) {
                console.log("Charing customer failed. Error: " + error);
                return Parse.Promise.error("There was an error processing the card. Please try again");
            });
        }
    }).then(function(purchase) {


        customer = request.user;
        var token = customer.getSessionToken();

        event = new Event();
        event.id = request.params.eventId;

        var admissionOption = new AdmissionOption();
        admissionOption.id = request.params.admissionOptionId;

        completedTransaction = new Parse.Object('CompletedTransaction');
        completedTransaction.set("description", request.params.description);
        completedTransaction.set("date", new Date());
        completedTransaction.set("customerName", request.params.customerName);
        completedTransaction.set("venue", request.params.venue);
        completedTransaction.set("amountPaid", request.params.amount.toFixed(2));
        completedTransaction.set("customer", customer);
        completedTransaction.set("event", event);
        completedTransaction.set("admissionOption", admissionOption);
        // completedTransaction.set("stripePurchaseId", purchase.id);

        return completedTransaction.save(null, {
            sessionToken: token
        }).then(null, function(error) {
            console.log('There was an error saving the completed transaction. Error: ' + error);
            return Parse.Promise.error("There was an error storing your transaction. Please contact us through chat to resolve this issue as quick as possible.");
        });
    }).then(function(completedTransaction) {

        guestlistInvite = new GuestlistInvite();
        guestlistInvite.id = request.params.guestlistInviteId;

        return Parse.Cloud.httpRequest({
            url: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + customer.id + "_" + request.params.guestlistId
        }).then(null, function(httpResponse) {
            console.error("Error generating qr code. HttpResponse: " + httpResponse.status);
            return Parse.Promise.error("There was an error generating your ticket. Please contact us through chat to resolve this issue as quickly as possible.");
        });
    }).then(function(httpResponse) {

        var imageBuffer = httpResponse.buffer;
        var parseFile = new Parse.File('ticket.png', {
            base64: imageBuffer.toString('base64')
        });

        guestlistInvite.set("qrCode", parseFile);
        guestlistInvite.set("response", 1);
        guestlistInvite.set("admissionDescription", request.params.description);

        return guestlistInvite.save({
            useMasterKey: true
        }).then(null, function(error) {
            console.log("Updating guestlist invite failed. Error: " + error);
            return Parse.Promise.error("There was an error generating your QR code. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(guestlistInvite) {
        response.success(request.params.guestlistInviteId);
    }, function(error) {
        response.error(error);
    });
});

/***** retrieving payment info ***/

Parse.Cloud.define('retrievePaymentInfo', function(request, response) {

    // Parse.Cloud.useMasterKey();

    Parse.Promise.as().then(function() {
         console.log("retrieving payment info",request.user)
         // var currentUser = Parse.User.current();
         // console.log("server side loggedin?:",currentUser)
        var stripeCustomerId = request.user.get("stripeCustomerId");

        if (stripeCustomerId) {
            return Stripe.customers.retrieve(stripeCustomerId)
                .then(null, function(error) {
                    return Parse.Promise.error("There was an error retrieving your card information");
                });
        } else {
            return Parse.Promise.as([]);
        }
    }).then(function(customer) {



        var customerInfo;
        (_.isEmpty(customer)) ? customerInfo = null: customerInfo = customer.sources.data;
                console.log("cutomerInfo: ",customerInfo);
        response.success(customerInfo);
    }, function(error) {
        response.error(error);
    });
});

/***** removing credit card ****/
Parse.Cloud.define('removeCardInfo', function(request, response) {

    // Parse.Cloud.useMasterKey();

    Parse.Promise.as().then(function() {

        return Parse.Cloud.httpRequest({
            method: "DELETE",
            url: "https://" + STRIPE_SECRET_KEY + ':@' + STRIPE_API_BASE_URL + "/customers/" + request.params.customerId + "/cards/" + request.params.cardId
        }).then(null, function(httpResponse) {
            console.log('error removing card ' + httpResponse.status);
            return Parse.Promise.error("There was an error removing your card.");
        });
    }).then(function(httpResponse) {


        customer = request.user;
        var token = customer.getSessionToken();
        customer.unset("stripeCustomerId");

        return customer.save(null, {
            sessionToken: token
        }).then(null, function(error) {
            console.log('there was an error unsetting the user ' + JSON.stringify(error));
            return Parse.Promise.error('There was an error');
        });
    }).then(function(customer) {
        response.success();
    }, function(error) {
        response.error();
    });
});

/******** creating reservations *****/
Parse.Cloud.define('createReservation', function(request, response) {
    // Parse.Cloud.useMasterKey();

    var guestlistInvite, event, customer, savedGuestlistInvite;

    Parse.Promise.as().then(function() {

        customer = new Parse.User();
        customer.id = request.user.id;

        event = new Event();
        event.id = request.params.eventId;

        var admissionOption = new AdmissionOption();
        admissionOption.id = request.params.admissionOptionId;

        var guestlist = new Guestlist();
        guestlist.set("Owner", customer);
        guestlist.set("event", event);
        guestlist.set("date", new Date());
        guestlist.set("admissionOption", admissionOption);

        return guestlist.save({
            useMasterKey: true
        }).then(null, function(error) {
            console.log("Saving guestlist failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(guestlist) {


        guestlistInvite = new GuestlistInvite();
        guestlistInvite.set("Guestlist", guestlist);
        guestlistInvite.set("event", event);
        guestlistInvite.set("Guest", customer);
        guestlistInvite.set("sender", customer);
        guestlistInvite.set("checkInStatus", false);
        guestlistInvite.set("response", 1);
        guestlistInvite.set("phoneNumber", request.user.get('phoneNumber'));
        guestlistInvite.set("date", new Date(Date.parse(request.params.eventTime)));
        guestlistInvite.set("didOpen", false);

        return guestlistInvite.save({
            useMasterKey: true
        }).then(null, function(error) {
            console.log("Saving guestlistInvite failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(guestlistInvite) {

        savedGuestlistInvite = guestlistInvite;


        return Parse.Cloud.httpRequest({
            url: "https://" + INTERCOM_BASE_URL + "/users?user_id=" + customer.id,
            headers: {
                'Accept': 'application/json'
            },
            followRedirects: true
        }).then(null, function(httpResponse) {
            console.error("Error fetching intercom id. HttpResponse: " + httpResponse.status);
            return Parse.Promise.error("There was an error generating your ticket. Please contact us through chat to resolve this issue as quickly as possible.");
        });
    }).then(function(httpResponse) {

        return Parse.Cloud.httpRequest({
            url: 'https://' + INTERCOM_BASE_URL + '/messages',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: {
                "message_type": "inapp",
                "body": 'Hey ' + request.user.get('firstName') + ', you have successfully reserved the ' + request.params.descriptionName + ' @ ' + request.params.locationName + ' for ' + moment(request.params.eventTime).format('MM/DD') +
                    '. When you arrive at the venue, simply walk up to the front with your party and let them know you booked a table through Hype under your name. If you have any questions, message us here and we will be glad to help!',
                "from": {
                    "type": "admin",
                    "id": "428923"
                },
                "to": {
                    "type": "user",
                    "id": (JSON.parse(httpResponse.text))["id"]
                }
            }
        }).then(null, function(httpResponse) {
            console.error("Error fetching sending message. HttpResponse: " + httpResponse.status);
            return Parse.Promise.error("There was an error setting up a conversation. Please contact us through chat to resolve this issue as quickly as possible.");
        });
    }).then(function(httpResponse) {

        response.success(savedGuestlistInvite.id);

    }, function(error) {
        response.error(JSON.stringify(error));
    });
});

/******** crediting users  ********/
Parse.Cloud.afterSave("GuestlistInvite", function(request) {

    if (request.object.existed() && request.object.get("checkInStatus")) {
        // Parse.Cloud.useMasterKey();
        var guest, creditPayout;
        Parse.Promise.as().then(function() {

            var eventId = request.object.get("event").id;

            var queryEvent = new Parse.Query("Event")
                .equalTo('objectId', eventId);

            return queryEvent.first().then(null, function(error) {
                console.log("there was problem in querying for the event");
            });
        }).then(function(event) {

            if (!event) {
                console.log("there was no event found");
                return;
            }

            guest = new Parse.User();
            guest.id = request.object.get("Guest").id;

            guest.increment('credits', event.get("creditsPayout"));

            return guest.save({
                useMasterKey: true
            }).then(null, function(error) {
                console.log('there was an error saving the sender ' + JSON.stringify(error));
            });
        }).then(function(savedGuest) {

            var mixpanel = Mixpanel.init(mixpanelToken);
            var distinctId = guest.id;
            var properties = {
                'distinct_id': distinctId
            };

            return mixpanel.track('AcceptedTicket', properties).then(null, function(error) {
                console.log('there was an error tracking with mixpanel');
            });
        }).done()
    } else {
        return;
    }
});


Parse.Cloud.define('hypeLaunchPartyPurchase', function(request, response) {

    console.log('request is ' + JSON.stringify(request));

    var eventId = request.params.eventId;
    var admissionOptionId = request.params.admissionOptionId;
    var email = request.params.email;
    var customerName = request.params.customerName;


    // Parse.Cloud.useMasterKey();

    var customer, guestlist, event, image, parseFile;

    Parse.Promise.as().then(function() {

        var user = new Parse.User();
        // user.set("email", request.params.email);
        user.set("username", Math.random().toString(36).slice(2));
        user.set("password", "dummyaccount");


        return user.save({
            useMasterKey: true
        }).then(null, function(error) {
            console.log('there was an error creating the user ' + JSON.stringify(error));
            return Parse.Promise.error('Error generating the user.');
        });
    }).then(function(savedGuest) {

        customer = savedGuest;

        var admissionOption = new AdmissionOption();
        admissionOption.id = admissionOptionId;

        event = new Event();
        guestlist = new Guestlist();

        guestlist.set("Owner", customer);
        guestlist.set("event", event);
        guestlist.set("date", new Date());
        guestlist.set("admissionOption", admissionOption);

        return guestlist.save({
            useMasterKey: true
        }).then(null, function(error) {
            console.log("Saving guestlist failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(savedGuestlist) {

        guestlist = savedGuestlist;

        guestlistInvite = new GuestlistInvite();
        guestlistInvite.set("Guestlist", guestlist);
        guestlistInvite.set("event", event);
        guestlistInvite.set("Guest", customer);
        guestlistInvite.set("sender", customer);
        guestlistInvite.set("checkInStatus", false);
        guestlistInvite.set("response", 1);
        guestlistInvite.set("date", new Date());
        guestlistInvite.set("didOpen", false);

        return Parse.Cloud.httpRequest({
            url: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + customer.id + "_" + guestlist.id
        }).then(null, function(httpResponse) {
            console.error("Error generating qr code. HttpResponse: " + httpResponse.status);
            return Parse.Promise.error("There was an error generating your ticket. Please contact us through chat to resolve this issue as quickly as possible.");
        })
    }).then(function(httpResponse) {

        console.log(JSON.stringify(httpResponse));
        console.log(JSON.stringify(httpResponse.buffer));

        var imageBuffer = httpResponse.buffer;
        parseFile = new Parse.File('ticket.png', {
            base64: imageBuffer.toString('base64')
        });

        guestlistInvite.set("qrCode", parseFile);

        return guestlistInvite.save({
            useMasterKey: true
        }).then(null, function(error) {
            console.log("Saving guestlist invite failed. Error: " + JSON.stringify(error));
            return Parse.Promise.error("There was an error generating your guestlist invite. Please contact us through chat to resolive this issue as quickly as possible.");
        });
    }).then(function(savedGuestlist) {

        // console.log(JSON.stringify(savedGuestlist));
        qrCode = savedGuestlist.get('qrCode');
        // console.log(qrCode);
        // console.log(qrCode.url());

        var params = Serialize({
            To: request.params.phoneNumber,
            From: twilioPhoneNumber,
            Body: "Your ticket",
            MediaInfo: qrCode.url()
        });


        return Parse.Cloud.httpRequest({
            url: 'https://AC5769b578ec09cd8522d36f3b12ac07c7:b6991654dae45aa26f4219335cd63418@api.twilio.com/2010-04-01/Accounts/AC5769b578ec09cd8522d36f3b12ac07c7/Messages.json',
            method: 'POST',
            body: params
        });

    }).then(function(emailSent) {
        console.log(JSON.stringify(emailSent));
        response.success(true);

    }, function(error) {
        response.error(error);
    });
});


function Serialize(obj) {
    var str = [];
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    }
    console.log("Serialized object: " + str);
    return str.join("&");
};
/**
  Update Events by 4am
**/

var kue = require('kue');
var queue = kue.createQueue({
    redis: 'redis://h:p130l529a4jg211ap91bd2gkqq2@ec2-54-163-236-235.compute-1.amazonaws.com:18809',
    skipConfig: true
});



queue.process('scheduledEventUpdate_27', function(job, done) {


     var d = new Date();
        d.setHours(8);
        d.setMinutes(10);
        d.setSeconds(0);
    td = new Date(d.getTime() + (24 * 60 * 60 * 1000));

    console.log('Tomorrow update time is:', td);
    queue.create('scheduledEventUpdate_27').delay(td).priority('high').save();

    var query = new Parse.Query('Event');
    query.lessThanOrEqualTo("date", d);
    query.greaterThanOrEqualTo("date", new Date(d.getTime() - (24 * 60 * 60 * 1000)));

    query.find({
        success: function(results) {
            if (results.length == 0) {
                console.log("******** No events to updated today!");
            } else {
                console.log("******** Some events should updated today!");
            }
        },
        error: function(error) {
            console.log("********", error);
        }
    });
    query.each(function(event) {
            if (event.get("doesRepeat")) {
                newEvent = new Event();
                var oldDate = new Date(event.get("date"));
                newEvent.set("admissionOptions", event.get("admissionOptions"));
                newEvent.set("creditsPayout", event.get("creditsPayout"));
                if (event.get("ageRequirement")) newEvent.set("ageRequirement", event.get("ageRequirement"));
                newEvent.set("date", new Date(oldDate.setDate((oldDate.getDate() + 14))));
                newEvent.set("doesRepeat", event.get("doesRepeat"));
                newEvent.set("location", event.get("location"));
                newEvent.set('locationId', event.get('locationId'));
                if (event.get("organizer")) newEvent.set("organizer", event.get("organizer"));
                if (event.get("organizerId")) newEvent.set("organizerId", event.get("organizerId"));
                if (event.get("title")) newEvent.set("title", event.get("title"));
                newEvent.set("venueName", event.get("venueName"));
                console.log('newEvent', newEvent.get("date"), 'is done');
                return newEvent.save();
            }else{
                console.log("Event is not Repeated Event");
            }
        })
        .then(function() {
            // Set the job's success status
            httpResponse.status.success("Migration completed successfully.");
        }, function(error) {
            // Set the job's error status
            httpResponse.status.error("Uh oh, something went wrong. " + error.message);
        })
    setTimeout(function() {
        done();
    }, 7000);

})

kue.Job.rangeByType('scheduledEventUpdate_27', 'delayed', 0, 10, '', function(err, jobs) {

    if (err) {
        return handleErr(err);
    }

    if (!jobs.length) {
        var d = new Date();
        d.setHours(8);
        d.setMinutes(0);
        d.setSeconds(0);
        //+24 housrs
        // d = new Date(d.getTime() + (1000 * 60 * 60 * 24));

        console.log("first start time: " + d);
        queue.create('scheduledEventUpdate_27').delay(d).priority('high').save();
    }
    console.log("job length: " + jobs.length);
});



// var kue=require('kue');
// var queue=kue.createQueue({
//       redis:'redis://h:p130l529a4jg211ap91bd2gkqq2@ec2-54-163-236-235.compute-1.amazonaws.com:18809'
// });

// var job=queue.create('scheduledEventUpdates').priority('normal').save();

// queue.process('scheduledEventUpdates',updateEvents);

// function updateEvents(job, done){
//     // Set up to modify user data
//     //Parse.Cloud.useMasterKey();
//     var counter = 0;
//     // Query for all users
//     var query = new Parse.Query('Event');

//     query.lessThanOrEqualTo("date", new Date);
//     query.greaterThanOrEqualTo("date", new Date(new Date().getTime() - (24 * 60 * 60 * 1000)));
//     query.each(function(event) {

//         newEvent = new Event();

//         var oldDate = new Date(event.get("date"));

//         // newEvent.set( )
//         newEvent.set("date", new Date(oldDate.setDate((oldDate.getDate() + 14))));
//         newEvent.set("creditsPayout", event.get("creditsPayout"));
//         if (event.get("ageRequirement")) newEvent.set("ageRequirement", event.get("ageRequirement"));
//         newEvent.set("location", event.get("location"));
//         newEvent.set("admissionOptions", event.get("admissionOptions"));

//         if (counter % 100 === 0) {
//             // Set the  job's progress status

//             Parse.Cloud.httpResponse.status.message(counter + " events processed.");
//         }
//         counter += 1;
//         return newEvent.save();
//     }).then(function() {
//         // Set the job's success status
//         Parse.Cloud.httpResponse.status.success("Migration completed successfully.");
//     }, function(error) {
//         // Set the job's error status
//         Parse.Cloud.httpResponse.status.error("Uh oh, something went wrong. " + error.message);
//     })
//       console.log("Job",job.id,"done");
//      done();
// }

// Parse.Cloud.job("scheduledEventUpdates", function(request, status) {
//     // Set up to modify user data
//     Parse.Cloud.useMasterKey();
//
//     var query = new Parse.Query('Event');
//     query.lessThanOrEqualTo("date", new Date);
//     query.greaterThanOrEqualTo("date", new Date(new Date().getTime() - (24 * 60 * 60 * 1000)));
//     query.each(function (event) {
//         if (event.get("doesRepeat")) {
//
//             newEvent = new Event();
//
//             var oldDate = new Date(event.get("date"));
//
//             newEvent.set("date", new Date(oldDate.setDate((oldDate.getDate() + 14))));
//             newEvent.set("creditsPayout", event.get("creditsPayout"));
//             newEvent.set("doesRepeat", event.get("doesRepeat"));
//             newEvent.set("venueName", event.get("venueName"));
//             if (event.get("organizer")) newEvent.set("organizer" , event.get("organizer"));
//             if (event.get("organizerId")) newEvent.set("organizerId" , event.get("organizerId"));
//
//             if (event.get("title")) newEvent.set("title" , event.get("title"));
//             if (event.get("ageRequirement")) newEvent.set("ageRequirement", event.get("ageRequirement"));
//             newEvent.set('locationId', event.get('locationId'));
//             newEvent.set("location", event.get("location"));
//             newEvent.set("admissionOptions", event.get("admissionOptions"));
//             return newEvent.save();
//         }
//     }).then(function () {
//         // Set the job's success status
//         status.success("Migration completed successfully.");
//     }, function (error) {
//         // Set the job's error status
//         status.error("Uh oh, something went wrong. " + error.message);
//     })
// });
