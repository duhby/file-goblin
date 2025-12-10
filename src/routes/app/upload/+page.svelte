<script lang="ts">
  import {
    getFiles,
    deleteFile,
    createUploadUrl,
    finalizeUpload,
    getTags,
  } from "$lib/remote/data.remote";
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
  import { PUBLIC_CDN_URL } from "$env/static/public";

  let filesQuery = $state(getFiles(undefined));
  let tagsQuery = $state(getTags(undefined));

  let deletingFiles = $state(new Set<string>());

  // Upload form state
  let file = $state<File | null>(null);
  let editableFileName = $state("");
  let fileExtension = $state("");
  let selectedTagIds = $state<string[]>([]);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let uploadStatus = $state<"idle" | "uploading" | "success" | "error">("idle");
  let errorMessage = $state("");
  let fileInput: HTMLInputElement;

  function getFileType(mimeType: string): "image" | "video" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    throw new Error("Unsupported file type. Only images and videos are allowed.");
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files[0]) {
      const selectedFile = target.files[0];

      // Validate file type on selection
      if (!selectedFile.type.startsWith("image/") && !selectedFile.type.startsWith("video/")) {
        errorMessage = "Only image and video files are supported";
        uploadStatus = "error";
        file = null;
        target.value = "";
        return;
      }

      file = selectedFile;

      // Split filename into name and extension
      const lastDotIndex = selectedFile.name.lastIndexOf(".");
      if (lastDotIndex > 0) {
        editableFileName = selectedFile.name.substring(0, lastDotIndex);
        fileExtension = selectedFile.name.substring(lastDotIndex);
      } else {
        editableFileName = selectedFile.name;
        fileExtension = "";
      }

      uploadStatus = "idle";
      errorMessage = "";
      selectedTagIds = [];
    }
  }

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
    } else {
      selectedTagIds = [...selectedTagIds, tagId];
    }
  }

  async function handleUpload() {
    if (!file) {
      errorMessage = "Please select a file first";
      uploadStatus = "error";
      return;
    }

    if (!editableFileName.trim()) {
      errorMessage = "Filename cannot be empty";
      uploadStatus = "error";
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      errorMessage = "Only image and video files are supported";
      uploadStatus = "error";
      return;
    }

    try {
      uploading = true;
      uploadStatus = "uploading";
      uploadProgress = 0;
      errorMessage = "";

      const finalFileName = editableFileName.trim() + fileExtension;
      const fileType = getFileType(file.type);

      // Step 1: Get upload URL
      const { uploadUrl, fileId } = await createUploadUrl({
        filename: finalFileName,
        contentType: file.type,
        fileType: fileType,
      });

      // Step 2: Upload to S3
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          uploadProgress = Math.round((e.loaded / e.total) * 100);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file!.type);
        xhr.send(file!);
      });

      uploadProgress = 100;

      // Step 3: Finalize upload (create database entry with tags)
      await finalizeUpload({
        fileId,
        filename: finalFileName,
        fileType: fileType,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });

      uploadStatus = "success";

      // Refresh file list
      filesQuery = getFiles(undefined);

      setTimeout(() => {
        file = null;
        editableFileName = "";
        fileExtension = "";
        selectedTagIds = [];
        uploadStatus = "idle";
        uploadProgress = 0;
        if (fileInput) fileInput.value = "";
      }, 2000);
    } catch (err) {
      uploadStatus = "error";
      errorMessage = err instanceof Error ? err.message : "Upload failed";
    } finally {
      uploading = false;
    }
  }

  async function handleDelete(fileId: string) {
    if (deletingFiles.has(fileId)) return;

    deletingFiles.add(fileId);

    try {
      await deleteFile(fileId);
      filesQuery = getFiles(undefined);
    } catch (error) {
      console.error("Error deleting file:", error);
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
      <Card class="w-full">
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload images or videos with custom names and tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <!-- File Input -->
            <div class="flex flex-col gap-2">
              <label for="file-input" class="text-sm font-medium">Select File</label>
              <input
                id="file-input"
                type="file"
                accept="image/*,video/*"
                onchange={handleFileSelect}
                bind:this={fileInput}
                disabled={uploading}
                class="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  file:cursor-pointer cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {#if file}
              <!-- File Info -->
              <div class="text-sm text-muted-foreground border rounded-md p-3 bg-muted/50">
                <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                <p><strong>Type:</strong> {file.type}</p>
              </div>

              <!-- Editable Filename -->
              <div class="flex flex-col gap-2">
                <label for="filename-input" class="text-sm font-medium">File Name</label>
                <div class="flex items-center gap-2">
                  <input
                    id="filename-input"
                    type="text"
                    bind:value={editableFileName}
                    disabled={uploading}
                    placeholder="Enter file name"
                    class="flex-1 px-3 py-2 text-sm rounded-md border border-input bg-background
                      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
                      disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span class="text-sm text-muted-foreground font-mono">{fileExtension}</span>
                </div>
              </div>

              <!-- Tag Selection -->
              <div class="flex flex-col gap-2">
                <span class="text-sm font-medium">Tags (optional)</span>
                {#await tagsQuery}
                  <p class="text-sm text-muted-foreground">Loading tags...</p>
                {:then tags}
                  {#if tags && tags.length > 0}
                    <div class="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                      {#each tags as tag}
                        <label
                          class="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTagIds.includes(tag.id)}
                            onchange={() => toggleTag(tag.id)}
                            disabled={uploading}
                            class="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Badge
                            variant="outline"
                            style="border-color: {tag.color}; color: {tag.color};"
                          >
                            {tag.name}
                          </Badge>
                        </label>
                      {/each}
                    </div>
                    {#if selectedTagIds.length > 0}
                      <div class="flex flex-wrap gap-2 pt-2">
                        <span class="text-xs text-muted-foreground">Selected:</span>
                        {#each selectedTagIds as tagId}
                          {@const selectedTag = tags.find((t) => t.id === tagId)}
                          {#if selectedTag}
                            <Badge
                              style="background-color: {selectedTag.color}20; border-color: {selectedTag.color}; color: {selectedTag.color};"
                            >
                              {selectedTag.name}
                            </Badge>
                          {/if}
                        {/each}
                      </div>
                    {/if}
                  {:else}
                    <p class="text-sm text-muted-foreground">
                      No tags created yet. <a href="/app/tags" class="text-primary hover:underline"
                        >Create tags</a
                      > to organize your files.
                    </p>
                  {/if}
                {:catch error}
                  <p class="text-sm text-red-600">Error loading tags: {error.message}</p>
                {/await}
              </div>
            {/if}

            <!-- Progress Bar -->
            {#if uploadStatus === "uploading"}
              <div class="space-y-2">
                <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    class="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style="width: {uploadProgress}%"
                  ></div>
                </div>
                <p class="text-sm text-center text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            {/if}

            <!-- Success Message -->
            {#if uploadStatus === "success"}
              <div class="p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 rounded-md">
                <p class="text-sm text-green-700 dark:text-green-400">
                  ✓ File uploaded successfully!
                </p>
              </div>
            {/if}

            <!-- Error Message -->
            {#if uploadStatus === "error"}
              <div class="p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 rounded-md">
                <p class="text-sm text-red-700 dark:text-red-400">
                  ✗ {errorMessage}
                </p>
              </div>
            {/if}

            <!-- Upload Button -->
            <Button
              onclick={handleUpload}
              disabled={!file || uploading || !editableFileName.trim()}
              class="w-full"
            >
              {#if uploading}
                <Spinner class="mr-2" />
                Uploading...
              {:else}
                Upload File
              {/if}
            </Button>
          </div>
        </CardContent>
      </Card>
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
                        {#if deletingFiles.has(file.id)}
                          <Spinner class="mr-2" />
                          Deleting
                        {:else}
                          Delete
                        {/if}
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
