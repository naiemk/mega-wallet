
# The whole product.

Our product is a wallet, that will hold only USD stable coins. Designed to hide crypto, and for people that have never used crypto. The first version uses an operator on the other end, which controls the off-ramps. In future we will make this non-custodial. The point of wallet is that it only understand one type of money: USD. All other types of money / crypto are only used in on/off ramps as output or input. Everything becomes USD once in the wallet.

The on-ramp, or main page, is a UI similar to transfer-wise. But when we get into steps, we expose the wallet. We also will have a wallet page, with deposit / withdraw options. The transfer / exchange page, will create a wizard: deposit USD. Then withdraw USD to target.

We allow deposit using onramper. Withdraw for V1 is both possible using onramper off-ramp, or also Shaba system for Iran.

We will have UI and API backend, Plust local sql DB. Research the login options. Should we implement ourselves or use a cheap / free tier 3p? All successful events, (i.e. money in / out) will need to be logged in a persistent manner on a cloud based immutable system or db, easily dedupable (unique id independent of DB) so that we can re-built the balances in case of DB loss.

For UI, try your best to look great. Mobile first. We don't care much about desktop view. Mobile view is the most important. Simulate transferwise but with focus on better support of rtl languages (Farsi, Arabic)

## User stories

- As a user, I want to chose source / destination currency and amount and get a quote. I also want to chose the source payment method (Debit, Credit, Revolute, Paypal, etc. See onramper) and the provider (e.g. RevolutePay, MoonPay, etc.) I will receive the best provider option auto selected
- As a user, I want to remember my preferred payment method (priority of last successful tx, then last try)
- As a user, I want to start exchange based on the provided quote. A quote is valid for N hours. I can see the countdown for quote validity
- As a user, I want to transfer funds in to the system. Using the trustless-commerce platform.
- As a user, I want to check the status of my transaction (only one tx at a time): 3 steps. Funds deposited (ing). Receipient set. Receipient received, withdrawals (initiated, executed, cancelled, need attention)
- As a user, I want to check the status of all 3 steps above.
- As a user, I want to be able to create account. The account needs email (verify not necessary to begin with). And on iphone / androind should sign in using passkeys. I also need a name
- As a user, I want to be able to sign in using passkey 
- As a user, I want to see my transaction history
- As a user, I want to be able to verify / change my email
- As a user, I want to know if my deposit quote is still valid (as long as unpaid). A quote is valid, if the onramper quote provides the same UDSC for the slippage, and if the recipient amount (e.g. IRR) remains in the slippage range.
- As a user, I want consistent language selection (my last pereferred). Option to change the language on the toolbar, which country flag logos. And the provided default.
- As a user, I want to see my USD balance in the wallet.
- As a user, I want to initiate deposits or withdraws from my wallet page.
- As a user, I want to be able to invite others and get collect small percentage of my friend fees as bonus, upto a certain amount.
- As a user, I want to see the total bonus collected and my affiliate link and see encouraging UI

- As an operator, I want to be able to sign in to the system (same as user process)
- As an operator, I want to see all requests, filter by status and search for a name
- As an operator, I want to see the request and check the recipient
- As an operator, I want to set a receipient status to received and upload evidence (optional) plus comments. This will set the receipt data
- As an operator, I also see the operator tab, and dashboard (summary of totals, volume, no, deposited, unsettled)
- As an operator, my email must be verified
- As an operator, I must set my wallet addresses, on all accepted chains (ethereum, base, tron). Can be set at deploy time in config.

- As an admin, I want to be able to sign in (same as others)

Use 3p for login if it makes it easier. Don't overcomplicated the login/register process. Prioritize passkey. Make sure works for both android and iphone

## System design

For exchange we are using the following path: Source currency -> USDT/USDC. Then USDC/USDT -> target currency.
The source to usdc/t is done through trustless-commerce invoices (and our hardcoded wallets). 
USDC -> Target is done manually

TC uses onramper for onramp to stables. We need to use the onramper quoting API to calculate the amounts given user source currency and amount (and debit card / revolut) as payment method. User can select the payment method (similar to what onramper supports)

For withdraw, find 3 sources for the USDT live price to IRR, and aggregate them. Keep the target modular so that we can change / add other targets in futrue.

We use vibed-infra for deployment on a VPS. Make the process compatible.
