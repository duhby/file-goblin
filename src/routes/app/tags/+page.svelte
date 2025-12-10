<script lang="ts">
  import {
    getTags,
    createTag,
    updateTag,
    deleteTag,
    getTagHierarchy,
  } from "$lib/remote/data.remote";
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Spinner } from "$lib/components/ui/spinner";
  import iro from "@jaames/iro";
  import { Trash2, PencilLine, Plus, X, Check } from "@lucide/svelte";

  let showCreateForm = $state(false);
  let editingTagId = $state<string | null>(null);
  let creatingTag = $state(false);
  let updatingTag = $state(false);
  let deletingTagIds = $state<Set<string>>(new Set());

  // Form state
  let newTagName = $state("");
  let newTagColor = $state("#6366f1");
  let editTagName = $state("");
  let editTagColor = $state("#6366f1");

  // Color picker instances
  let createColorPicker: any = null;
  let editColorPicker: any = null;

  function initCreateColorPicker() {
    const container = document.getElementById("create-color-picker");
    if (container && !createColorPicker) {
      createColorPicker = iro.ColorPicker(container, {
        width: 200,
        color: newTagColor,
        layout: [
          {
            component: iro.ui.Wheel,
            options: {},
          },
          {
            component: iro.ui.Slider,
            options: {
              sliderType: "value",
            },
          },
        ],
      });

      createColorPicker.on("color:change", (color: any) => {
        newTagColor = color.hexString.toUpperCase();
      });
    }
  }

  function handleCreateColorInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let value = input.value;

    // Ensure it starts with #
    if (!value.startsWith("#")) {
      value = "#" + value;
    }

    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      newTagColor = value.toUpperCase();
      if (createColorPicker) {
        createColorPicker.color.hexString = value;
      }
    }
  }

  function initEditColorPicker() {
    const container = document.getElementById("edit-color-picker");
    if (container && !editColorPicker) {
      editColorPicker = iro.ColorPicker(container, {
        width: 200,
        color: editTagColor,
        layout: [
          {
            component: iro.ui.Wheel,
            options: {},
          },
          {
            component: iro.ui.Slider,
            options: {
              sliderType: "value",
            },
          },
        ],
      });

      editColorPicker.on("color:change", (color: any) => {
        editTagColor = color.hexString.toUpperCase();
      });
    }
  }

  function handleEditColorInput(e: Event) {
    const input = e.target as HTMLInputElement;
    let value = input.value;

    // Ensure it starts with #
    if (!value.startsWith("#")) {
      value = "#" + value;
    }

    // Validate hex color format
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      editTagColor = value.toUpperCase();
      if (editColorPicker) {
        editColorPicker.color.hexString = value;
      }
    }
  }

  function toggleCreateForm() {
    showCreateForm = !showCreateForm;
    if (showCreateForm) {
      newTagName = "";
      newTagColor = "#6366f1";
      setTimeout(() => {
        initCreateColorPicker();
      }, 50);
    } else {
      if (createColorPicker) {
        createColorPicker = null;
      }
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || creatingTag) return;

    try {
      creatingTag = true;
      await createTag({ name: newTagName, color: newTagColor });
      getTags().refresh();
      getTagHierarchy().refresh();
      toggleCreateForm();
    } catch (error) {
      console.error("Failed to create tag:", error);
    } finally {
      creatingTag = false;
    }
  }

  function startEditTag(tag: { id: string; name: string; color: string }) {
    editingTagId = tag.id;
    editTagName = tag.name;
    editTagColor = tag.color;
    setTimeout(() => {
      initEditColorPicker();
      if (editColorPicker) {
        editColorPicker.color.hexString = tag.color;
      }
    }, 50);
  }

  function cancelEdit() {
    editingTagId = null;
    if (editColorPicker) {
      editColorPicker = null;
    }
  }

  async function handleUpdateTag() {
    if (!editingTagId || !editTagName.trim() || updatingTag) return;

    try {
      updatingTag = true;
      await updateTag({ id: editingTagId, name: editTagName, color: editTagColor });
      getTags().refresh();
      getTagHierarchy().refresh();
      cancelEdit();
    } catch (error) {
      console.error("Failed to update tag:", error);
    } finally {
      updatingTag = false;
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (deletingTagIds.has(tagId)) return;
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      deletingTagIds.add(tagId);
      await deleteTag(tagId);
      getTags().refresh();
      getTagHierarchy().refresh();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    } finally {
      deletingTagIds.delete(tagId);
    }
  }
</script>

<div class="max-w-screen-xl mx-auto p-8">
  <div class="flex justify-between items-center mb-8">
    <div>
      <h1 class="text-3xl font-bold mb-2">Tags</h1>
      <p class="text-gray-600 dark:text-gray-400 text-base">Manage your file tags</p>
    </div>
    <Button onclick={toggleCreateForm}>
      {#if showCreateForm}
        <X class="w-4 h-4 mr-2" />
        Cancel
      {:else}
        <Plus class="w-4 h-4 mr-2" />
        New Tag
      {/if}
    </Button>
  </div>

  {#if showCreateForm}
    <Card class="mb-8">
      <CardHeader>
        <CardTitle>Create New Tag</CardTitle>
        <CardDescription>Add a new tag with a custom color</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <label for="tag-name" class="font-medium text-sm">Tag Name</label>
            <input
              id="tag-name"
              type="text"
              bind:value={newTagName}
              placeholder="Enter tag name"
              class="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-base focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white dark:bg-gray-950"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="create-color-picker" class="font-medium text-sm">Color</label>
            <div class="flex gap-6 items-start">
              <div id="create-color-picker"></div>
              <div class="flex flex-col gap-4">
                <div
                  class="flex items-center justify-center w-[120px] h-[120px] rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  style="background-color: {newTagColor};"
                >
                  <span class="bg-white/90 px-3 py-1 rounded font-semibold text-sm text-black"
                    >{newTagColor}</span
                  >
                </div>
                <div class="flex flex-col gap-1">
                  <label for="create-hex-input" class="text-xs font-medium">Hex Code</label>
                  <input
                    id="create-hex-input"
                    type="text"
                    value={newTagColor}
                    oninput={handleCreateColorInput}
                    placeholder="#000000"
                    class="w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-base focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-mono uppercase bg-white dark:bg-gray-950"
                    maxlength="7"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 justify-end">
            <Button variant="outline" onclick={toggleCreateForm} disabled={creatingTag}
              >Cancel</Button
            >
            <Button onclick={handleCreateTag} disabled={!newTagName.trim() || creatingTag}>
              {#if creatingTag}
                <Spinner class="mr-2" />
                Creating
              {:else}
                <Check class="w-4 h-4 mr-2" />
                Create Tag
              {/if}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}

  {#await getTags()}
    <div class="text-center py-12 text-gray-600 dark:text-gray-400">Loading tags...</div>
  {:then tags}
    {#if tags.length === 0}
      <Card>
        <CardContent class="text-center py-12 text-gray-600 dark:text-gray-400">
          <p>No tags yet. Create your first tag to get started!</p>
        </CardContent>
      </Card>
    {:else}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-5">
        {#each tags as tag (tag.id)}
          <Card class="transition-shadow hover:shadow-lg">
            {#if editingTagId === tag.id}
              <CardContent class="p-5">
                <div class="flex flex-col gap-2 mb-6">
                  <label for="edit-tag-name-{tag.id}" class="font-medium text-sm">Tag Name</label>
                  <input
                    id="edit-tag-name-{tag.id}"
                    type="text"
                    bind:value={editTagName}
                    class="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-base focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white dark:bg-gray-950"
                  />
                </div>

                <div class="flex flex-col gap-2 mb-6">
                  <label for="edit-color-picker" class="font-medium text-sm">Color</label>
                  <div class="flex gap-6 items-start">
                    <div id="edit-color-picker"></div>
                    <div class="flex flex-col gap-4">
                      <div
                        class="flex items-center justify-center w-[120px] h-[120px] rounded-lg border-2 border-gray-200 dark:border-gray-700"
                        style="background-color: {editTagColor};"
                      >
                        <span class="bg-white/90 px-3 py-1 rounded font-semibold text-sm text-black"
                          >{editTagColor}</span
                        >
                      </div>
                      <div class="flex flex-col gap-1">
                        <label for="edit-hex-input" class="text-xs font-medium">Hex Code</label>
                        <input
                          id="edit-hex-input"
                          type="text"
                          value={editTagColor}
                          oninput={handleEditColorInput}
                          placeholder="#000000"
                          class="w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-base focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-mono uppercase bg-white dark:bg-gray-950"
                          maxlength="7"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex gap-3 justify-end">
                  <Button variant="outline" size="sm" onclick={cancelEdit} disabled={updatingTag}>
                    <X class="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onclick={handleUpdateTag}
                    disabled={!editTagName.trim() || updatingTag}
                  >
                    {#if updatingTag}
                      <Spinner class="mr-1" />
                      Saving
                    {:else}
                      <Check class="w-4 h-4 mr-1" />
                      Save
                    {/if}
                  </Button>
                </div>
              </CardContent>
            {:else}
              <CardContent class="flex justify-between items-center p-5">
                <div class="flex flex-col gap-3 flex-1">
                  <div class="flex items-center gap-2">
                    <Badge style="background-color: {tag.color}; color: white;">
                      {tag.name}
                    </Badge>
                  </div>
                  <div class="flex items-center gap-2">
                    <div
                      class="w-6 h-6 rounded border-2 border-gray-200 dark:border-gray-700"
                      style="background-color: {tag.color};"
                    ></div>
                    <span class="font-mono text-[0.85rem] text-gray-600 dark:text-gray-400"
                      >{tag.color}</span
                    >
                  </div>
                </div>

                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => startEditTag(tag)}
                    disabled={deletingTagIds.has(tag.id)}
                  >
                    <PencilLine class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => handleDeleteTag(tag.id)}
                    disabled={deletingTagIds.has(tag.id)}
                  >
                    {#if deletingTagIds.has(tag.id)}
                      <Spinner />
                    {:else}
                      <Trash2 class="w-4 h-4" />
                    {/if}
                  </Button>
                </div>
              </CardContent>
            {/if}
          </Card>
        {/each}
      </div>
    {/if}
  {:catch error}
    <Card>
      <CardContent class="text-center py-12">
        <p class="text-red-600 dark:text-red-400">Error loading tags: {error.message}</p>
      </CardContent>
    </Card>
  {/await}
</div>

<style>
  @media (max-width: 768px) {
    .max-w-screen-xl {
      padding: 1rem;
    }

    .flex.justify-between.items-center.mb-8 {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .grid.grid-cols-\[repeat\(auto-fill\,minmax\(350px\,1fr\)\)\] {
      grid-template-columns: 1fr;
    }

    .flex.gap-6.items-start {
      flex-direction: column;
    }

    .flex.justify-between.items-center.p-5 {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .flex.gap-2:last-child {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
