<script lang="ts">
  import { createUploadUrl } from "../../routes/upload/data.remote";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";

  let file = $state<File | null>(null);
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

  async function handleUpload() {
    if (!file) {
      errorMessage = "Please select a file first";
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

      const { uploadUrl } = await createUploadUrl({
        filename: file!.name,
        contentType: file!.type,
        fileType: getFileType(file!.type),
      });

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

      uploadStatus = "success";
      uploadProgress = 100;

      setTimeout(() => {
        file = null;
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
      uploadStatus = "idle";
      errorMessage = "";
    }
  }
</script>

<Card class="w-full max-w-md">
  <CardHeader>
    <CardTitle>Upload File</CardTitle>
    <CardDescription>Upload images or videos to your collection</CardDescription>
  </CardHeader>
  <CardContent>
    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <label for="file-input" class="text-sm font-medium"> Select File </label>
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
        <div class="text-sm text-muted-foreground">
          <p><strong>File:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Type:</strong> {file.type}</p>
        </div>
      {/if}

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

      {#if uploadStatus === "success"}
        <div class="p-3 bg-green-100 dark:bg-green-900/20 border border-green-400 rounded-md">
          <p class="text-sm text-green-700 dark:text-green-400">✓ File uploaded successfully!</p>
        </div>
      {/if}

      {#if uploadStatus === "error"}
        <div class="p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 rounded-md">
          <p class="text-sm text-red-700 dark:text-red-400">
            ✗ {errorMessage}
          </p>
        </div>
      {/if}

      <Button onclick={handleUpload} disabled={!file || uploading} class="w-full">
        {#if uploading}
          Uploading...
        {:else}
          Upload File
        {/if}
      </Button>
    </div>
  </CardContent>
</Card>
