# Automated Trading

## Overview

This project is the automated trading setup used by [Benjamin Lupton](https://balupton.com), which already accomplishes:

1. Trading View strategies are saved into the `tradingview` directory
1. Trading View strategies are added to the the Trading View interface, to see how they perform via Trading View's backtesting feature
1. Trading View alerts are created via the study that accompanies the strategy (as Trading View strategies do not support alerts)
1. Use Trading View's Server-Side SMS Alert feature to send the alert to a Twilio number
1. Use the Twilio number to send the message via Web Hook to a Firebase Function that parses it
1. Use the Firebase Function to act upon the alert message, with the usual intention of placing a trade via one or more intended Exchange APIs

With enough effort, it will also accomplish:

1. Storage of trade data for historical reporting of profit and loss against strategies and securities
1. Storage of market data for more advanced strategies that can be operated independently of Trading View
1. An app that allows users to register, browse strategy performance, and connect their portfolios to the strategies
1. A marketplace for acquiring and renting strategies (%/$ on profits/month/trade)
1. Public/Private user profiles, automated trade performance, and portfolio size

Difficulties with this vision are:

1. Trading View offers no API for
    1. injecting strategies against securities
    1. injecting alerts on those strategies
1. In order for Trading View to successfully send an alert, it requires a perfect balance of:
    1. Correct strategy and study setup, including correct input options
    1. Correct chart and change duration setup
    1. Correct connection between the strategy and the chart for correct alert setup
    1. Ensuring that none of this automation configuration changes in the process of just using trading view for everyday things
    1. A Premium Trading View plan in order to get access to their Server-Side SMS Alert feature, the only alert feature that sends alerts even when you have Trading View closed
1. Trading View has a few unexpected features/bugs:
    1. Backtesting on Renko charts places realtime virtual trades at non-realtime prices, producing falsely optimal results
    1. `valuewhen(change(series), series, ForLoopIteration)` does not seem to work as expected when inside a for loop, it seems to always produce the same result
    1. There is no logging or debugging in pine script, which makes figuring out the unexpected implausible

This would be assisted by either:

1. Moving away from Trading View
    1. This may happen in 2018, as currently other backtesting solutions seem of alpha quality
    1. This would also allow potentially more advanced trading strategies, such as AI based ones
1. Working with Trading View to solve the earlier issues
1. A combination of both of the above; where this service evolves into an automated trading empire, where the strategies is a seperate empire which connects to this one, allowing any strategy service to connect to this user-facing (automated) trade placement solution


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
