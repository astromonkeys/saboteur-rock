# Saboteur Rock

Saboteur Rock is an indie role-based deception party game, designed to be played with anywhere from 8 to 14 players. Wow!

# Premise
	
Imagine you find yourself shipwrecked on a deserted island. Among you are the lucky, or perhaps unlucky, SS Voyageur passengers who survived the crash.

Also among you is a secret Saboteur, directly responsible for the shipwreck. It was the intention of the Saboteur to bring you to this island to compete in a game of survival.

If the group can work together to vote out the Saboteur, the remaining Passengers can return home. But, if the Passengers vote incorrectly, they sacrifice an innocent life. The Saboteurs and loyal Stowaways, meanwhile, want to sacrifice as many Passengers as possible to gain a majority in the group.

In this twisted game, communication is only allowed through one-on-one Deliberations before casting a vote. If there is a tie, the Saboteur has the final say. 

Trust no one, because at any given moment, you could be talking to the Saboteur.

# How it works

Players will join a game on their mobile device - when running locally, this means navigating to `http://localhost:4200`, or some other local network address(see Setup). One player, ideally one who's played before, will host a game. The host controls the game flow - moving between rounds, configuring options, and pausing the game if necessary. All other players will join the game using the game code provided by the host.

When all players are ready to begin, the host will start the game - randomly assigning everyone a team(Passengers or Stowaways) and a role. The player roles vary, so it's best to carefully read your role card and consult the in-game information menu(top right corner of the screen, appears once the first round of meetings begins). Some role abilities can be used each round, some only once per game - use them wisely!

Once teams and roles have been assigned, the Marooning begins - the moments following the shipwreck, where the Stowaways learn of each other's identities. The host's device will play a recorded script, so all players have to do is follow the instructions.

Now, the first round of meetings begins. All meetings are one-on-one, no group discussion is allowed. On each device, the meetings for the current 'deliberation'(there are several deliberations per round, a deliberation is a set of simultaneous meetings, of different people in different rooms) will be displayed, as well as a timer signaling the start/end of transition and meeting periods.

Once a round is over, it's time to vote. Players will vote on their devices for who they want to eliminate, prompted to use their ability, if applicable. Once all votes are in, the results will be shown on each player's device. It is revealed if the eliminated player(s) was the Saboteur or not. The host can then begin the next round once everyone is ready. Any eliminated players are no longer able to vote or be in meetings.

The game ends once either the Saboteur is eliminated, or the Stowaways have gained a majority over the Passengers.

# Setup

To build and run this project locally:
  1. Clone the repository
  2. Ensure npm and node.js are installed on your system. This project was originally developed with npm v10.9.0 and node v22.12.0. You may need newer versions to use updated versions of angular.
  3. Open a terminal and build saboteur-lib(shared objects and types): `cd saboteur-lib && npm run build`.
  4. In another terminal, `cd /app/server` and `npm install && npm start` to run the backend server.
  5. In another terminal, `cd /app/client` and `npm install && npm start` to run the angular dev server.
  6. Navigate to `http://localhost:4200` in your browser (Any relatively recent browser should work, including on mobile)

Notes:
  - `/app/server/config.ts` may need to be configured with additional IP addresses - you may need to manually create this file and add this line:
    `export const Config = { whitelist: ['http://localhost:4200', <other_local_ip_address>:4200, ...] }`
  In order for the angular server to be accessible from other devices on your local network, you'll need to add your machine's IPv4 address(x.x.x.x) here, in addition to `localhost`. Port 4200 is the default port for angular dev servers. You may need to check your system's firewall as well.
  - For example, to run the angular server on your local network, the command may look like this:
    `ng serve --host <local_ipv4_address> --disable-host-check --configuration production`
