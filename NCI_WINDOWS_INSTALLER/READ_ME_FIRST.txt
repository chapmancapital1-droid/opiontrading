NERDCOMMAND - NCI TRADING
=========================

Put all four .bat files in your opiontrading folder.
That is the folder that has package.json in it.

Then double-click them in this order.


STEP 1 --------------------------------------------
  INSTALL_NCI.bat

  Run this once. Takes a few minutes.
  It installs everything and wires the build together.

  If it says Node.js is not installed, get it from
  https://nodejs.org (choose LTS), install it, then
  double-click INSTALL_NCI.bat again.


STEP 2 --------------------------------------------
  START_APP.bat

  Opens the dashboard in your browser.
  Leave the black window open while you use it.
  Close that window when you are done.

  Things to try on the Board tab:
    - Click BEARISH under Chart Trends.
      The strategy list re-ranks.
    - Turn off COMPANION MODE.
      Sell Put and Sell Call stop being blocked.
    - Drag the DELTA slider to 0.30.
    - In PAIR TO PARE set contracts 4, premium 2.50.
      Then change contracts to 2 and read the warning.


STEP 3 --------------------------------------------
  RUN_SIMULATION.bat

  Runs paper trades. No real money, ever.
  Ask it for 20 days the first time.

  Read the EXPECTANCY number at the end.
  That is the average dollars per trade.
  Negative means the strategy loses money.


ANYTIME ------------------------------------------
  RESET_SIMULATION.bat

  Wipes the paper trading history and starts
  over at $300. Your code is not touched.


IF SOMETHING BREAKS ------------------------------
  Take a screenshot of the black window and send
  it to Claude. The error text is what matters.
