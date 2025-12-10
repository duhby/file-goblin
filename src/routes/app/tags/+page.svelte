<script lang="ts">
  import { onMount } from "svelte";
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
  import iro from "@jaames/iro";
  import { Trash2, Edit2, Plus, X, Check } from "@lucide/svelte";

  let tags = $state<Array<{ id: string; name: string; color: string; userId: string }>>([]);
  let tagHierarchy = $state<{
    tags: any[];
    relationships: Array<{ parentId: string | null; childId: string | null }>;
  }>({ tags: [], relationships: [] });
  let loading = $state(true);
  let showCreateForm = $state(false);
  let editingTagId = $state<string | null>(null);

  // Form state
  let newTagName = $state("");
  let newTagColor = $state("#6366f1");
  let editTagName = $state("");
  let editTagColor = $state("#6366f1");

  // Color picker instances
  let createColorPicker: any = null;
  let editColorPicker: any = null;

  async function loadTags() {
    try {
      loading = true;
      const result = await getTags();
      tags = result || [];
      const hierarchyResult = await getTagHierarchy();
      tagHierarchy = hierarchyResult || { tags: [], relationships: [] };
    } catch (error) {
      console.error("Failed to load tags:", error);
    } finally {
      loading = false;
    }
  }

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
        newTagColor = color.hexString;
      });
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
        editTagColor = color.hexString;
      });
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
    if (!newTagName.trim()) return;

    try {
      await createTag({ name: newTagName, color: newTagColor });
      await loadTags();
      toggleCreateForm();
    } catch (error) {
      console.error("Failed to create tag:", error);
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
    if (!editingTagId || !editTagName.trim()) return;

    try {
      await updateTag({ id: editingTagId, name: editTagName, color: editTagColor });
      await loadTags();
      cancelEdit();
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  }

  async function handleDeleteTag(tagId: string) {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      await deleteTag(tagId);
      await loadTags();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  }

  function isRootTag(tagId: string): boolean {
    return !tagHierarchy.relationships.some((rel) => rel.childId === tagId);
  }

  onMount(() => {
    loadTags();
  });
</script>

<div class="tags-container">
  <div class="header">
    <div>
      <h1>Tags</h1>
      <p class="subtitle">Manage your file tags and organize them hierarchically</p>
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
    <Card class="create-form">
      <CardHeader>
        <CardTitle>Create New Tag</CardTitle>
        <CardDescription>Add a new tag with a custom color</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="form-content">
          <div class="form-field">
            <label for="tag-name">Tag Name</label>
            <input
              id="tag-name"
              type="text"
              bind:value={newTagName}
              placeholder="Enter tag name"
              class="input"
            />
          </div>

          <div class="form-field">
            <label for="create-color-picker">Color</label>
            <div class="color-picker-container">
              <div id="create-color-picker"></div>
              <div class="color-preview" style="background-color: {newTagColor};">
                <span class="color-hex">{newTagColor}</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <Button variant="outline" onclick={toggleCreateForm}>Cancel</Button>
            <Button onclick={handleCreateTag} disabled={!newTagName.trim()}>
              <Check class="w-4 h-4 mr-2" />
              Create Tag
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  {/if}

  {#if loading}
    <div class="loading">Loading tags...</div>
  {:else if tags.length === 0}
    <Card>
      <CardContent class="empty-state">
        <p>No tags yet. Create your first tag to get started!</p>
      </CardContent>
    </Card>
  {:else}
    <div class="tags-grid">
      {#each tags as tag (tag.id)}
        <Card class="tag-card">
          {#if editingTagId === tag.id}
            <CardContent class="edit-form">
              <div class="form-field">
                <label for="edit-tag-name-{tag.id}">Tag Name</label>
                <input
                  id="edit-tag-name-{tag.id}"
                  type="text"
                  bind:value={editTagName}
                  class="input"
                />
              </div>

              <div class="form-field">
                <label for="edit-color-picker">Color</label>
                <div class="color-picker-container">
                  <div id="edit-color-picker"></div>
                  <div class="color-preview" style="background-color: {editTagColor};">
                    <span class="color-hex">{editTagColor}</span>
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <Button variant="outline" size="sm" onclick={cancelEdit}>
                  <X class="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onclick={handleUpdateTag} disabled={!editTagName.trim()}>
                  <Check class="w-4 h-4 mr-1" />
                  Save
                </Button>
              </div>
            </CardContent>
          {:else}
            <CardContent class="tag-display">
              <div class="tag-info">
                <div class="tag-badge-container">
                  <Badge style="background-color: {tag.color}; color: white;">
                    {tag.name}
                  </Badge>
                  {#if isRootTag(tag.id)}
                    <span class="root-indicator">Root</span>
                  {/if}
                </div>
                <div class="tag-color-info">
                  <div class="color-swatch" style="background-color: {tag.color};"></div>
                  <span class="color-code">{tag.color}</span>
                </div>
              </div>

              <div class="tag-actions">
                <Button variant="outline" size="sm" onclick={() => startEditTag(tag)}>
                  <Edit2 class="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onclick={() => handleDeleteTag(tag.id)}>
                  <Trash2 class="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          {/if}
        </Card>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tags-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 2rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #6b7280;
    font-size: 0.95rem;
  }

  :global(.create-form) {
    margin-bottom: 2rem;
  }

  .form-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-field label {
    font-weight: 500;
    font-size: 0.9rem;
  }

  .input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.95rem;
  }

  .input:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .color-picker-container {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }

  .color-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 120px;
    height: 120px;
    border-radius: 0.5rem;
    border: 2px solid #e5e7eb;
  }

  .color-hex {
    background: rgba(255, 255, 255, 0.9);
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .loading {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  :global(.empty-state) {
    text-align: center;
    padding: 3rem;
    color: #6b7280;
  }

  .tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.25rem;
  }

  :global(.tag-card) {
    transition: box-shadow 0.2s;
  }

  :global(.tag-card:hover) {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  :global(.tag-display) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem;
  }

  .tag-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1;
  }

  .tag-badge-container {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .root-indicator {
    font-size: 0.75rem;
    color: #6b7280;
    background: #f3f4f6;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }

  .tag-color-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 0.25rem;
    border: 2px solid #e5e7eb;
  }

  .color-code {
    font-family: monospace;
    font-size: 0.85rem;
    color: #6b7280;
  }

  .tag-actions {
    display: flex;
    gap: 0.5rem;
  }

  :global(.edit-form) {
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    .tags-container {
      padding: 1rem;
    }

    .header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .tags-grid {
      grid-template-columns: 1fr;
    }

    .color-picker-container {
      flex-direction: column;
    }

    :global(.tag-display) {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .tag-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
