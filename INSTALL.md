# Project Setup

## Functions Setup

### Setup Firebase

Get going with Firebase:
https://firebase.google.com/docs/functions/get-started

### Clone & Deploy

``` bash
git clone https://github.com/balupton/automated-trading.git
cd automated-trading
npm run deploy
```

### Account Creation

``` bash
# create a user and get its id
http -f POST https://VALUE.cloudfunctions.net/createUser \
    email='VALUE'


# get bitfinex serviceid, use your bitfinex API details
http -f POST https://VALUE.cloudfunctions.net/bitfinex_createService \
    atuserid='VALUE' \
    key='VALUE' \
    secret='VALUE'


# get itbit serviceid, use your itbit API details
http -f POST https://VALUE.cloudfunctions.net/itbit_createService \
    atuserid='VALUE' \
    userid='VALUE' \
    key='VALUE' \
    secret='VALUE'

# verify itbit
http -f POST https://VALUE.cloudfunctions.net/itbit_fetchWallets \
    atuserid='VALUE' \
    atserviceid='VALUE'


# get drivewealth serviceid, use your drivewealth login details
http -f POST https://VALUE.cloudfunctions.net/drivewealth_createService \
    atuserid='VALUE' \
    username='VALUE' \
    password='VALUE'

# initialise drivewealth session
http -f POST https://VALUE.cloudfunctions.net/drivewealth_createSession \
    atuserid='VALUE' \
    atserviceid='VALUE'


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
Webhook: https://VALUE.cloudfunctions.net/parse?atuserid=VALUE
HTTP POST

Primary handler fails: TwiML: reject
```



## Trading View


### Phone Number

Configure your Trading View phone numnber to be your Twilio one.

### Add Strategies

Create a strategy and add its accompanying study. You need to add an accompanying study in order to link up alerts. As strategies for some silly reason cannot create alerts.

You can strategies in the [`tradingview` directory](https://github.com/balupton/automated-trading/tree/master/tradingview).


### Alerts

When you've made your strategy, then create alerts for it. Use the "SMS" feature, and the appropriate message from the following:

#### Buy Stock Message

``` json
{"atmarket": "stock", "call": "order", "symbol": "TSLA", "action": "buy"}
```

#### Sell Stock Message

``` json
{"atmarket": "stock", "call": "order", "symbol": "TSLA", "action": "sell"}
```

#### Buy Crypto Message

``` json
{"atmarket": "cryptocurrency", "call": "order", "symbol": "BTCUSD", "action": "buy"}
```

#### Sell Crypto Message

``` json
{"atmarket": "cryptocurrency", "call": "order", "symbol": "BTCUSD", "action": "sell"}
```
