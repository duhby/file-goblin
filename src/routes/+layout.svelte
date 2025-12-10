<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { ModeWatcher } from "mode-watcher";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";

  let { children } = $props();

  let currentPath = $state("");

  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
  }

  let showThemeToggle = $derived(!currentPath.startsWith("/app"));
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
{@render children()}
{#if showThemeToggle}
  <ThemeToggle floating />
{/if}
