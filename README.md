# Automated Trading

## Overview

This project is the automated trading setup used by [Benjamin Lupton](https://balupton.com), codenamed `baltrade`, which already accomplishes:

1. [Trading View](http://balupton.com/tradingview) strategies are saved into the [`tradingview` directory](https://github.com/balupton/automated-trading/tree/master/tradingview)
1. Trading View strategies are added to the the Trading View interface, to see how they perform via Trading View's backtesting feature
1. Trading View alerts are created via the study that accompanies the strategy (as Trading View strategies do not support alerts)
1. Use Trading View's Server-Side SMS Alert feature to send the alert to a Twilio number
1. Use the Twilio number to send the message via Web Hook to a Firebase Function that parses it
1. Use the Firebase Function to act upon the alert message, with the usual intention of placing a trade via one or more intended Exchange APIs

That is to say, **this is already a working solution for placing automated trades with various exchanges via Trading View strategies**.

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

How to help:

1. Trading View strategies
    1. You can help me improve my current strategies
    1. You can write new strategies and add them
1. More exchanges
    1. Feel free to add support for more exchanges, I will happily merge them
2. User-facing app
    1. We can work together on the user facing app, that will allow users to register, add their exchanges, and view performance
3. Review
    1. You can review what has been done and help me improve it, especially from a security perspective
4. Investment
    1. You can help me connect a team/location/mentors and funds to build this out, make it into a product and a business, and hopefully double every user's money while they sleep

I am not sure open-sourcing of this is a good or bad idea, as it could be I am naive, so here are my thoughts:

1. Bad idea:
    1. someone more familiar with big finance takes an optimal strategy stored here, and sells it to big finance making millions of dollars without me, ruining my return on investment
    1. some assumptions or code in this project could be fatally flawed, and someone decides to exploit it
1. Neutral idea:
    1. a larger team takes the ambitions here, and makes the project happen without me — neutral return on investment, as I will still benefit from their result, even if my own investment was at a loss
    1. individuals and firms may not trust the project with their money, unless they too can inspect its operations, which open-source provides - however, they could just fork it, and setup their own product based off it, using their big brand name as leverage
1. Good idea:
    1. someone more familiar with big finance notices the potential in the project, and reaches out to help make it happen, offering expertise and/or funding and/or team suggestions
    1. others also interested in this area help flesh this out, where one's expertise in one area compliments another's naiveity - this could be accomplished without open-source, but to do it without open-source, I'll need to hire people, of which, I'll need to find people to hire (first problem), and then to hire them (second problem)
    1. some assumptions or code in this project could be fatally flawed, and someone else can spot it before it becomes more of a liability
    1. the progress of strategies and implementation can be shared with support groups and other interested parties, to faciliate improvements and collaboration

[Resources.](https://docs.google.com/spreadsheets/d/1m9E0SSG0nnjP1hOfC2i5TJiduCMGinJ6_EcaFyz_3NA/)


## Installation

See the [`INSTALL.md` guide](https://github.com/balupton/automated-trading/blob/master/INSTALL.md) for how to setup this project yourself. Once there is a user-facing app, this will not be needed.



## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non-infringement. In no event shall the authors, copyright holders, or Bevry be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.

Use the software at your own risk. You are responsible for your own money. Past performance is not necessarily indicative of future results.

The authors and all affiliates assume no responsibility for your trading results.


## License

Licensed under the [MIT License](http://creativecommons.org/licenses/MIT/)
<br/>Copyright &copy; 2017+ [Benjamin Arthur Lupton](http://balupton.com)
