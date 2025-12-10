<script lang="ts">
  import FileUpload from "$lib/components/FileUpload.svelte";
  import { getFiles, deleteFile } from "./data.remote";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { PUBLIC_CDN_URL } from "$env/static/public";

  let filesQuery = $state(getFiles());

  let deletingFiles = $state(new Set<string>());

  async function handleDelete(fileId: string) {
    if (deletingFiles.has(fileId)) return;

    deletingFiles.add(fileId);

    try {
      await deleteFile(fileId);
      filesQuery = getFiles();
    } catch (error) {
      console.error("Error delating file:", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      deletingFiles.delete(fileId);
    }
  }

  function getFileUrl(fileId: string, fileName: string): string {
    return `${PUBLIC_CDN_URL}/${fileId}/${fileName}`;
  }
</script>

<svelte:head>
  <title>Upload Files - File Goblin</title>
</svelte:head>

<div class="container mx-auto p-4 space-y-8">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">Upload Files</h1>
    <p class="text-muted-foreground">Upload and manage your images and videos</p>
  </div>

  <div class="grid gap-8 md:grid-cols-2">
    <!-- Upload Section -->
    <div>
      <FileUpload />
    </div>

    <!-- Files List Section -->
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Your Files</CardTitle>
          <CardDescription>Recently uploaded files</CardDescription>
        </CardHeader>
        <CardContent>
          {#await filesQuery}
            <p class="text-sm text-muted-foreground">Loading files...</p>
          {:then files}
            {#if files && files.length > 0}
              <div class="space-y-2">
                {#each files.slice(0, 10) as file}
                  <div class="flex items-center justify-between p-2 border rounded-md">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">{file.name}</p>
                      <p class="text-xs text-muted-foreground capitalize">{file.type}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                        {file.type}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => window.open(getFileUrl(file.id, file.name), "_blank")}
                      >
                        Link
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onclick={() => handleDelete(file.id)}
                        disabled={deletingFiles.has(file.id)}
                      >
                        {deletingFiles.has(file.id) ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-muted-foreground">No files uploaded yet</p>
            {/if}
          {:catch error}
            <p class="text-sm text-red-600">Error loading files: {error.message}</p>
          {/await}
        </CardContent>
      </Card>
    </div>
  </div>
</div>
