<script lang="ts">
  import Navbar from "$lib/components/Navbar.svelte";
  import type { LayoutData } from "./$types.js";

  let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<Navbar user={data.user} />

<main class="container mx-auto">
  {@render children()}
</main>
