# Automated Trading

MIT LICENSE

THIS IS INTERNAL SOFTWARE FOR MY OWN USE — IF YOU USE IT, DO NOT BLAME ME!

Goals:

1. Create trading view strategies that work very well
2. Have those strategies place trades with my exchanges

Implementation:

1. Trading View's server-side SMS
2. Twilio Number
3. Firebase Function
4. DriveWealth/Bitfinex API


## Functions Setup

### Setup Firebase

Get going with Firebase:
https://firebase.google.com/docs/functions/get-started

### Clone & Deploy

```
git clone https://github.com/balupton/automated-trading.git
cd automated-trading
npm run deploy
```

### Account Creation

```
# create a user and get its id
http -f POST https://VALUE.cloudfunctions.net/createUser \
    email='VALUE'

# get bitfinex serviceid, use your bitfinex API details
http -f POST https://VALUE.cloudfunctions.net/bitfinex_createService \
    userid='VALUE' \
    key='VALUE' \
    VALUE='VALUE'

# get drivewealth serviceid, use your drivewealth login details
http -f POST https://VALUE.cloudfunctions.net/drivewealth_createService \
    userid='VALUE' \
    username='VALUE' \
    password='VALUE'

# initialise drivewealth session
http -f POST https://VALUE.cloudfunctions.net/drivewealth_createSession \
    userid='VALUE' \
    serviceid='VALUE'

# remove the above commands from fish shell history
history clear

# remove the above commands from bash shell history
rm ~/.bash_history
```



## Twilio

### TwiML Bins

Create the following [TwiML Bins](https://www.twilio.com/console/runtime/twiml-bins)

#### Reject

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Reject reason="busy" />
</Response>
```

#### Nothing

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```


### Number

Create a number and configure it like so:

```
== Voice & Fax ==

Accept incoming: Voice Calls

Configure with: Webhooks, or TwiML Bins or Functions

A call comes in: TwiML: nothing

Primary handler fails: TwiML: reject

Caller name lookup: disabled


== Messaging ==

Configuare with: Webhooks, or TwiML Bins or Functions

A message comes in:
Webhook: https://VALUE.cloudfunctions.net/parse?userid=VALUE
HTTP POST

Primary handler fails: TwiML: reject
```



## Trading View

If you don't have Trading View, use my referral link to sign up:
http://balupton.com/tradingview


### Phone Number

Configure your Trading View phone numnber to be your Twilio one.

### Add Strategies

Create a strategy and add its accompanying study. You need to add an accompanying study in order to link up alerts. As strategies for some silly reason cannot create alerts.

### Alerts

When you've made your strategy, then create alerts for it. Use the "SMS" feature, and the appropriate message from the following:

#### Buy Stock Message

```
{"serviceid": "VALUE", "call": "order", "symbol": "TSLA", "action": "buy"}
```

#### Sell Stock Message

```
{"serviceid": "VALUE", "call": "order", "symbol": "TSLA", "action": "sell"}
```

#### Buy Crypto Message

```
{"serviceid": "VALUE", "call": "order", "from": "btc", "to": "usd", "action": "buy"}
```

#### Sell Crypto Message

```
{"serviceid": "VALUE", "call": "order", "from": "btc", "to": "usd", "action": "sell"}
```

