# Automated Trading

## Overview

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

If you don't have Trading View, use my referral link to sign up:
http://balupton.com/tradingview


### Phone Number

Configure your Trading View phone numnber to be your Twilio one.

### Add Strategies

Create a strategy and add its accompanying study. You need to add an accompanying study in order to link up alerts. As strategies for some silly reason cannot create alerts.

You can find my strategies in the `tradingview` folder.


### Alerts

When you've made your strategy, then create alerts for it. Use the "SMS" feature, and the appropriate message from the following:

#### Buy Stock Message

```
{"atmarket": "stock", "call": "order", "symbol": "TSLA", "action": "buy"}
```

#### Sell Stock Message

```
{"atmarket": "stock", "call": "order", "symbol": "TSLA", "action": "sell"}
```

#### Buy Crypto Message

```
{"atmarket": "cryptocurrency", "call": "order", "from": "btc", "to": "usd", "action": "buy"}
```

#### Sell Crypto Message

```
{"atmarket": "cryptocurrency", "call": "order", "from": "btc", "to": "usd", "action": "sell"}
```


## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement. In no event shall the authors, copyright holders, or Bevry be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.

Use the software at your own risk. You are responsible for your own money. Past performance is not necessarily indicative of future results.

The authors and all affiliates assume no responsibility for your trading results.


## License

Licensed under the [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2017+ [Benjamin Arthur Lupton](http://balupton.com)
