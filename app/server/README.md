In playtesting, reconnecting to a game after a network interruption, user error, or user(s) disconnecting due to some other unexpected issue has been a major pain point.

This document aims to clearly outline the expected behavior on socket disconnect/reconnect, and how the client and server should handle such cases.

We can divide expected behavior by game phase, and further by UI state. 

All cases assume the server will sync the game object and player object, as well as player avatars, etc. with the client on reconnect.
In addition, on socket reconnect but prior to rejoining the game, the player will be given an option to re-join or exit to lobby.

Always provide the host the ability to proceed despite having disconnected players, kicking any disconnected players on this action. 
It should be made clear the player will be kicked out of the game - this should only be used if the player physically leaves the game with no intention to return.

Do nothing special for disconnected displays except for sending a toast notification to the host.

-- Pregame --
If pre-lobby, nothing to do.
If in lobby, send client back to the game lobby.

-- Marooning -- 
If marooning hasn't begun, block host from proceeding if there are any disconnected players
If marooning is ongoing, pause game until player(s) reconnect
If marooning has finished, block host from proceeding if there are any disconnected players

-- Round -- 
Do nothing by default as to not break the flow/urgency of meetings and transitions. The host can pause the game if the player really needs to reconnect ASAP, but the player can always check the display where they should be or other players can help them out.

-- Vote --
If voting hasn't begun, block host from proceeding if there are any disconnected players
If voting is ongoing, keep current behavior - voting won't end automatically, and the host can always close voting manually(maybe add a confirmation step here if there isn't one?)

-- Results --
Block host from proceeding to the next round if there are any disconnected players

-- Victory --
Send client to victory screen