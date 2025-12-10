<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui/avatar";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "$lib/components/ui/dropdown-menu";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import { authClient } from "$lib/client";
  import { goto } from "$app/navigation";
  import { Upload, FolderOpen, Tags } from "@lucide/svelte";

  let currentPath = $state("");

  if (typeof window !== "undefined") {
    currentPath = window.location.pathname;
  }

  type User = {
    name: string;
    email: string;
    image?: string | null;
  };

  let { user }: { user: User } = $props();

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          goto("/login");
        },
      },
    });
  }

  function isActivePath(path: string): boolean {
    return currentPath === path || currentPath.startsWith(path + "/");
  }
</script>

<nav
  class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
  <div class="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
    <div class="flex items-center gap-6">
      <a href="/app" class="flex items-center space-x-2">
        <span class="font-bold text-lg">File Goblin</span>
      </a>

      <div class="hidden md:flex items-center gap-1">
        <Button
          variant={isActivePath("/app") &&
          !isActivePath("/app/upload") &&
          !isActivePath("/app/tags")
            ? "secondary"
            : "ghost"}
          size="sm"
          href="/app"
        >
          <FolderOpen class="size-4" />
          Files
        </Button>
        <Button
          variant={isActivePath("/app/tags") ? "secondary" : "ghost"}
          size="sm"
          href="/app/tags"
        >
          <Tags class="size-4" />
          Tags
        </Button>
        <Button
          variant={isActivePath("/app/upload") ? "secondary" : "ghost"}
          size="sm"
          href="/app/upload"
        >
          <Upload class="size-4" />
          Upload
        </Button>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger>
          <button class="relative size-9 rounded-full">
            <Avatar>
              {#if user.image}
                <AvatarImage src={user.image} alt={user.name} />
              {/if}
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col space-y-1">
              <p class="text-sm font-medium leading-none">{user.name}</p>
              <p class="text-xs leading-none text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onclick={handleSignOut}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>

  <div class="md:hidden border-t">
    <div class="container flex items-center justify-around py-2 px-4">
      <Button
        variant={isActivePath("/app") && !isActivePath("/app/upload") && !isActivePath("/app/tags")
          ? "secondary"
          : "ghost"}
        size="sm"
        href="/app"
      >
        <FolderOpen class="size-4" />
        Files
      </Button>
      <Button
        variant={isActivePath("/app/tags") ? "secondary" : "ghost"}
        size="sm"
        href="/app/tags"
      >
        <Tags class="size-4" />
        Tags
      </Button>
      <Button
        variant={isActivePath("/app/upload") ? "secondary" : "ghost"}
        size="sm"
        href="/app/upload"
      >
        <Upload class="size-4" />
        Upload
      </Button>
    </div>
  </div>
</nav>
