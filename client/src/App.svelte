<script lang="ts">
  import { connect, disconnect } from "./lib/socket";
</script>

<main>
  <p>Click on the button to join the game room</p>
  <button on:click={() => connect()}> Connect </button>
  <p>Click on the button to leave the game room</p>
  <button on:click={() => disconnect()}> Disconnect </button>
</main>

<style>
</style>
