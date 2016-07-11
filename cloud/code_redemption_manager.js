var _ = require('underscore');
var moment = require('moment');
var queryInstallation = new Parse.Query(Parse.Installation);
var PromotionCodeEntry = Parse.Object.extend("PromotionCodeEntry");
var PromotionCode = Parse.Object.extend("PromotionCode");


module.exports.CodeRedemptionManager = function CodeRedemptionManager(guestId, promotionCode) {

  this.guestId = guestId;
  this.promotionCode = promotionCode;
  this.activePromotionCode;


  this.queryActivePromotionCode = function () {


    var queryPromotionCode = new Parse.Query("PromotionCode")
                                      .equalTo('code', this.promotionCode)
                                      .equalTo('active', true);


    return queryPromotionCode.first().then(null, function(error) {
      console.log('There was an error querying ' + JSON.stringify(error));
      return Parse.Promise.error('An error occured. Please try again.');
    });
  };


  this.queryPromoCodeEntry = function (activePromotionCode) {

    console.log('query for active promotion code ' + JSON.stringify(activePromotionCode));

    if (_.isEmpty(activePromotionCode)) {
      return Parse.Promise.as(false);
    }

    this.activePromotionCode = activePromotionCode;

    guest = new Parse.User();
    guest.id = this.guestId;

    var queryPromotionCodeEntry = new Parse.Query("PromotionCodeEntry")
                                           .equalTo('guest', guest)
                                           .equalTo('promotionCode', activePromotionCode);

    return queryPromotionCodeEntry.first().then(null, function(error) {
      console.log('There was an error querying ' + JSON.stringify(error));
      return Parse.Promise.error('An error occured. Please try again.');
    });
  };

  this.generatePromoCodeEntry = function (promotionCodeEntryQuery) {

    if (promotionCodeEntryQuery == false || !_.isEmpty(promotionCodeEntryQuery )) {
      return Parse.Promise.as([]);
    }

    guest = new Parse.User();
    guest.id = this.guestId;

    promotionCodeEntry = new PromotionCodeEntry();

    promotionCodeEntry.set('guest', guest);
    promotionCodeEntry.set('promoCode', this.promotionCode);
    promotionCodeEntry.set('promotionCode', this.activePromotionCode);
    promotionCodeEntry.set('date', new Date());

    return promotionCodeEntry.save();
  };

  this.creditUser = function (promotionCodeEntry) {
    if (_.isEmpty(promotionCodeEntry)) {
      return Parse.Promise.as([]);
    } else {

      guest = new Parse.User();
      guest.id = this.guestId;

      console.log(JSON.stringify(this.activePromotionCode));

      guest.increment('credits', this.activePromotionCode.get('creditAmount'));
      return guest.save();
    }
  };
};
