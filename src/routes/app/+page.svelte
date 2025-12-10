<script lang="ts">
  import type { PageData } from "./$types.js";
  import { getFiles, deleteFile, getTags } from "$lib/remote/data.remote";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import { Spinner } from "$lib/components/ui/spinner";
  import Trash2 from "@lucide/svelte/icons/trash-2";
  import LinkIcon from "@lucide/svelte/icons/link";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { PUBLIC_CDN_URL } from "$env/static/public";

  let { data }: { data: PageData } = $props();

  let selectedTagIds = $state<Set<string>>(new Set());

  let filesQuery = $derived.by(() => {
    if (selectedTagIds.size === 0) {
      return getFiles(undefined);
    }
    return getFiles({ tagIds: Array.from(selectedTagIds) });
  });

  let deletingFiles = $state(new Set<string>());
  let copiedFiles = $state(new Set<string>());

  function toggleTag(tagId: string) {
    const newSet = new Set(selectedTagIds);
    if (newSet.has(tagId)) {
      newSet.delete(tagId);
    } else {
      newSet.add(tagId);
    }
    selectedTagIds = newSet;
  }

  function clearTags() {
    selectedTagIds = new Set();
  }

  async function handleDelete(fileId: string) {
    if (deletingFiles.has(fileId)) return;

    deletingFiles = new Set(deletingFiles).add(fileId);

    try {
      await deleteFile(fileId);
      // Trigger a refresh using the query cache
      if (selectedTagIds.size === 0) {
        getFiles(undefined).refresh();
      } else {
        getFiles({ tagIds: Array.from(selectedTagIds) }).refresh();
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      const newSet = new Set(deletingFiles);
      newSet.delete(fileId);
      deletingFiles = newSet;
    }
  }

  function getFileUrl(fileId: string, fileName: string): string {
    return `${PUBLIC_CDN_URL}/${fileId}/${encodeURIComponent(fileName)}`;
  }

  function isImage(fileName: string): boolean {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
  }

  function isVideo(fileName: string): boolean {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "mov", "avi"].includes(ext || "");
  }

  async function copyFileLink(fileId: string, fileName: string) {
    const url = getFileUrl(fileId, fileName);
    try {
      await navigator.clipboard.writeText(url);
      copiedFiles = new Set(copiedFiles).add(fileId);

      // Reset the check icon after 2 seconds
      setTimeout(() => {
        const newSet = new Set(copiedFiles);
        newSet.delete(fileId);
        copiedFiles = newSet;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link to clipboard");
    }
  }
</script>

<svelte:head>
  <title>Files - File Goblin</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">Your Files</h1>
    <p class="text-muted-foreground">Browse and manage all your uploaded files</p>
  </div>

  <!-- Tag Filter -->
  <div class="w-full">
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium">Filter by Tags</h2>
        {#if selectedTagIds.size > 0}
          <Button variant="ghost" size="sm" onclick={clearTags}>
            Clear ({selectedTagIds.size})
          </Button>
        {/if}
      </div>
      {#await getTags()}
        <p class="text-sm text-muted-foreground">Loading tags...</p>
      {:then tags}
        <div class="flex flex-wrap gap-2">
          {#each tags as tag}
            <button
              type="button"
              class="focus-visible:border-ring focus-visible:ring-ring/50 inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] focus-visible:ring-[3px] cursor-pointer {selectedTagIds.has(
                tag.id,
              )
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground'}"
              style={selectedTagIds.has(tag.id)
                ? `background-color: ${tag.color}; border-color: ${tag.color};`
                : ""}
              onclick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          {/each}
          {#if tags.length === 0}
            <p class="text-sm text-muted-foreground">
              No tags yet. <a href="/app/tags" class="text-primary hover:underline">Create tags</a> to
              organize your files.
            </p>
          {/if}
        </div>
      {:catch error}
        <p class="text-sm text-red-600">Error loading tags: {error.message}</p>
      {/await}
    </div>
  </div>

  <!-- Files Grid -->
  <div>
    {#await filesQuery}
      <p class="text-sm text-muted-foreground">Loading files...</p>
    {:then files}
      {#if files && files.length > 0}
        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {#each files as file}
            <Card class="overflow-hidden gap-0 p-0">
              <CardContent class="p-0">
                <!-- Thumbnail Preview -->
                <div class="relative aspect-video bg-muted group">
                  <!-- Copy Link Button -->
                  <div
                    class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      class="h-8 w-8 shadow-lg"
                      onclick={(e) => {
                        e.stopPropagation();
                        copyFileLink(file.id, file.name);
                      }}
                      title="Copy link"
                    >
                      {#if copiedFiles.has(file.id)}
                        <CheckIcon class="h-4 w-4" />
                      {:else}
                        <LinkIcon class="h-4 w-4" />
                      {/if}
                      <span class="sr-only">Copy link</span>
                    </Button>
                  </div>

                  {#if isImage(file.name)}
                    <img
                      src={getFileUrl(file.id, file.name)}
                      alt={file.name}
                      class="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  {:else if isVideo(file.name)}
                    <video
                      src={getFileUrl(file.id, file.name)}
                      class="w-full h-full object-cover hover:opacity-90 transition-opacity"
                      muted
                      preload="metadata"
                    />
                    <div
                      class="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div
                        class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center"
                      >
                        <svg
                          class="w-6 h-6 text-white ml-1"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"
                          />
                        </svg>
                      </div>
                    </div>
                  {:else}
                    <div
                      class="w-full h-full flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                      onclick={() => window.open(getFileUrl(file.id, file.name), "_blank")}
                    >
                      <svg
                        class="w-16 h-16 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  {/if}
                </div>

                <!-- File Info -->
                <div class="p-3 space-y-2">
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p class="text-xs text-muted-foreground capitalize">{file.type}</p>
                  </div>

                  <!-- Tags -->
                  {#if file.tags && file.tags.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each file.tags as tag}
                        <Badge
                          style="background-color: {tag.color}; color: {tag.color === '#ffffff'
                            ? '#000000'
                            : '#ffffff'};"
                          class="text-xs"
                        >
                          {tag.name}
                        </Badge>
                      {/each}
                    </div>
                  {/if}

                  <!-- Actions -->
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      class="flex-1"
                      onclick={() => window.open(getFileUrl(file.id, file.name), "_blank")}
                    >
                      Open
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={() => handleDelete(file.id)}
                      disabled={deletingFiles.has(file.id)}
                    >
                      {#if deletingFiles.has(file.id)}
                        <Spinner />
                      {:else}
                        <Trash2 class="h-4 w-4" />
                      {/if}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          {/each}
        </div>
      {:else}
        <Card>
          <CardContent class="py-12">
            <div class="text-center space-y-2">
              <p class="text-lg text-muted-foreground">
                {selectedTagIds.size > 0
                  ? "No files found with selected tags"
                  : "No files uploaded yet"}
              </p>
              {#if selectedTagIds.size === 0}
                <p class="text-sm text-muted-foreground">
                  Head to the <a href="/app/upload" class="text-primary hover:underline"
                    >upload page</a
                  > to add files
                </p>
              {/if}
            </div>
          </CardContent>
        </Card>
      {/if}
    {:catch error}
      <Card>
        <CardContent class="py-12">
          <p class="text-sm text-red-600 text-center">Error loading files: {error.message}</p>
        </CardContent>
      </Card>
    {/await}
  </div>
</div>
