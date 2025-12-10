<script lang="ts">
  import type { PageData } from "./$types.js";

  let { data }: { data: PageData } = $props();
</script>

<div class="app-container">
  <h1>Welcome to File Goblin</h1>
  <p>You are logged in as: {data.user.email}</p>
</div>

<style>
  .app-container {
    padding: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 1rem;
  }
</style>
