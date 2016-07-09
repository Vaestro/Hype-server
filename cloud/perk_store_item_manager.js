  var _ = require('underscore');
var moment = require('cloud/moment.js');
var Mandrill = require('cloud/mandrill.js');
var INTERCOM_BASE_URL = 'eixn8wsn:5c0f7a0f42d3705369ed53d5d0c6695039a3ab58@api.intercom.io';

module.exports.PerkStoreItemManager = function PerkStoreItemManager(ownerId, perkStoreItemId, perkStoreItemCost, ownerCredits, perkStoreItemName, userEmail, userName) {

  this.ownerId = ownerId;
  this.perkStoreItemId = perkStoreItemId;
  this.perkStoreItemCost = perkStoreItemCost;
  this.ownerCredits = ownerCredits;
  this.perkStoreItemName = perkStoreItemName;
  this.userEmail = userEmail;
  this.userName = userName;


  /**
   * @param: -
   * @description: this function queries for the Owner of the redeemed perk by ownerId
   * @return: a Parse Promise in the form of a query for owner
   */
  this.findOwnerById = function() {
    console.log('hit find by ownerId');

    var queryUser = new Parse.Query(Parse.User)
      .equalTo("objectId", this.ownerId);

    return queryUser.first();
  };


  /**
   * @param: _User object 
   * @description: this function updates the Owner's credits
   * @return: a Parse Promise in the form of a Parse Object Save
   */
  this.updateOwnerCredits = function(owner) {
    // console.log('update owner credits ' + JSON.stringify(ownerArr));
    if (_.isEmpty(owner)) {
      console.log('empty');
      return Parse.Promise.as([]);
    } else {
      var creditsAfterPurchase = this.ownerCredits - this.perkStoreItemCost;
      owner.set("credits", creditsAfterPurchase);
      return owner.save();
    }
  };

  /**
   * @param: _User save 
   * @description: this function creates a PurchasedPerkItem object 
   * @return: a Parse Promise in the form of a Parse Object Save
   */
  this.createPurchasedPerkStoreItem = function(ownerSave) {
    if (_.isEmpty(ownerSave)) {
      return Parse.Promise.as(ownerSave);
    } else {
      purchasedPerkStoreItem = new Parse.Object("PurchasedPerkItem", {
        PerkStoreItem: {
          "__type": "Pointer",
          "className": "PerkStoreItem",
          "objectId": this.perkStoreItemId
        },
        user: {
          "__type": "Pointer",
          "className": "_User",
          "objectId": this.ownerId
        },
        purchaseDate: new Date()
      });
      return purchasedPerkStoreItem.save();
    }
  };


  /**
   * @param: Parse Object
   * @description: this function sends out an email to the owner using 
   * @return: a Parse Promise in the form of a Parse Object Save
   */
  this.findIntercomId = function(purchasedPerkItem) {

    if (_.isEmpty(purchasedPerkItem)) {
      return Parse.Promise.as([]);
    }
    
    return Parse.Cloud.httpRequest({
      url: "https://" + INTERCOM_BASE_URL  + "/users?user_id=" + this.ownerId,
      headers: {'Accept': 'application/json'},
      followRedirects: true 
    }).then(null, function(httpResponse) {
      console.error("Error fetching intercom id. HttpResponse: " + httpResponse.status);
      return Parse.Promise.error("There was an error completing your transaction. Please contact us through chat to resolve this issue as quickly as possible.");
    });
  };

  this.sendIntercomMessage = function(httpResponse) {

    return Parse.Cloud.httpRequest({
      url: 'https://' + INTERCOM_BASE_URL +'/messages',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: {
        "message_type": "inapp",
        "body": "Hey " + this.userName +', thank you for redeeming ' + this.perkStoreItemName +  '. We will be in contact soon with further instructions.',
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
      return Parse.Promise.error("There was an error completing your transaction. Please contact us through chat to resolve this issue as quickly as possible.");
    });
  };

};