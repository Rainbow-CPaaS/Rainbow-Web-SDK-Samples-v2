# Rainbow-Web-SDK-Samples-v2

This project is build following the starting guides available in on the public Rainbow Developpers website (https://developers.openrainbow.com/)

The idea is to have a quick starting app written in TypeScript (no framework) to show some basic implementations of the APIs **related to call management** that are avaialbe in the SDK Web (available on npm, "rainbow-web-sdk").

**I strongly advice you to use any modern framework for your application, as the code will be 3x easier to write and maintain** 

But for the sake of the demo and to be *framework-free*, the code is entarily written in TS with basic HTML/CSS; This application is probably not **bug free**, but it will give some general directions. I've taken some shortcuts in order to avoid having too complex code, so please read the comments in the code to see where we need to have better management to avoid issues (it's mostly related to checking capabilites and error management, so nothing too complicated but it should be done correctly as to give users a useful feedback, or simply not propose actions when we know they're not allowed).

To build & start the project, you'll need to a dev IDE of your choice, clone the project; install the prerequis described on the starting guides for SDK Web (node, rollup, etc) and then do:
(with node at least 18+)

`npm i`
`npm run build`
`npm run serve`

IF you have issues related to roll-out, install it globally
`npm install rollup --global`

And re-do the actions.

Now you've the project available on your localhost. 

**In order to know how to create your test app and obtain the application ID, please refer to the public website of Rainbow Developpers**


What you will find in this Sample app:
1. Simple login page
2. Search for Rainbow users
3. Make VoIP call to a given RB User
4. Make PBX call to a given number
5. Manage incoming calls to the connected user (both PXB or VoIP)
6. Simple call actions, like mute / unmute / hold / retrieve

Basically a simple *softphone app* 